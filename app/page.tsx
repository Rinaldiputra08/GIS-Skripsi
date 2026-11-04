'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { MapWrapper } from '@/components/MapWrapper';
import { MethodologyAuditModal } from '@/components/MethodologyAuditModal';
import { SurveyLocationModal } from '@/components/SurveyLocationModal';
import {
  BOGOR_DISTRICTS,
  BOGOR_COMPETITORS,
  BOGOR_ROADS,
  BOGOR_CROWD_CENTERS,
  BOGOR_GRID_CANDIDATES,
  BOGOR_EXCLUSION_ZONES,
} from '@/data/bogor-spatial';
import { applySettings } from '@/lib/settings';
import { buildAhpMatrix, calculateAhp, AHP_PRESETS } from '@/lib/ahp';
import { calculateTopsis } from '@/lib/topsis';
import { evaluateSurveyLocation } from '@/lib/survey-evaluator';
import {
  AhpResult,
  TopsisSummary,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  CompetitorPoint,
  CrowdCenterPoint,
  DistrictGeo,
  ExclusionZone,
  PointCriteria,
  RoadSegment,
  SpatialCandidate,
  SurveyPointEvaluation,
} from '@/lib/types';

export default function Home() {
  // 1. Spatial Entities State (loaded from Supabase or embedded defaults)
  const [competitors, setCompetitors] = useState<CompetitorPoint[]>(BOGOR_COMPETITORS);
  const [crowdCenters, setCrowdCenters] = useState<CrowdCenterPoint[]>(BOGOR_CROWD_CENTERS);
  const [districts, setDistricts] = useState<DistrictGeo[]>(BOGOR_DISTRICTS);
  const [roads, setRoads] = useState<RoadSegment[]>(BOGOR_ROADS);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>(BOGOR_EXCLUSION_ZONES);
  // Grid kandidat: dari database (grid_points) bila tersedia, jika tidak dari data cadangan lokal
  const [gridCandidates, setGridCandidates] = useState<SpatialCandidate[]>(BOGOR_GRID_CANDIDATES);
  const [dataSource, setDataSource] = useState<string>('embedded');

  // 3. AHP State
  const [activePreset, setActivePreset] = useState<string | null>('balanced');
  const [pairs, setPairs] = useState<Record<string, number>>({
    'c1-c2': 1,
    'c1-c3': 1,
    'c1-c4': 1,
    'c2-c3': 1,
    'c2-c4': 1,
    'c3-c4': 1,
  });

  // Calculate live AHP matrix & consistency
  const ahpResult: AhpResult = useMemo(() => {
    const matrix = buildAhpMatrix(pairs);
    return calculateAhp(matrix);
  }, [pairs]);

  // 4. TOPSIS Results State
  const [topsisResult, setTopsisResult] = useState<TopsisSummary>(() => {
    return calculateTopsis(BOGOR_GRID_CANDIDATES, [0.25, 0.25, 0.25, 0.25]);
  });

  const [isCalculating, setIsCalculating] = useState(false);

  // 5. UI & Selection State
  const [activeTab, setActiveTab] = useState<'ahp' | 'recommendations' | 'layers' | 'survey' | 'info'>('ahp');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<TopsisCandidateResult | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // 6. Live Field Survey State
  const [surveyResult, setSurveyResult] = useState<SurveyPointEvaluation | null>(null);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isSurveyClickMode, setIsSurveyClickMode] = useState(false);

  // 7. Layer Toggles State (with Exclusion Zones enabled by default)
  const [layers, setLayers] = useState<LayerToggleState>({
    showDistricts: true,
    showCompetitors: true,
    showRoads: false,
    showCrowdCenters: true,
    showRecommendations: true,
    showHeatmap: true,
    showExclusionZones: true,
    recommendationDisplayMode: 'radius',
    recommendationRadiusMeters: 250,
  });

  // 8. Filter State (with Exclusion Filter enabled by default to remove cemeteries/police)
  const [filters, setFilters] = useState<FilterState>({
    district: 'ALL',
    minScore: 0,
    category: 'all',
    excludeRestricted: true,
  });

  // Fetch live layers from Supabase API on mount
  useEffect(() => {
    async function loadLayers() {
      try {
        const res = await fetch('/api/layers/overview');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            applySettings(data.settings); // ambang kategori dari parameter sistem (admin)
            setDataSource(data.source);
            if (Array.isArray(data.exclusionZones)) setExclusionZones(data.exclusionZones);
            if (data.districts && data.districts.length > 0) setDistricts(data.districts);
            if (data.roads && data.roads.length > 0) setRoads(data.roads);
            if (data.grid && data.grid.length > 0) {
              setGridCandidates(data.grid);
              // Hitung ulang peringkat awal dari grid sumber utama
              setTopsisResult(calculateTopsis(data.grid, [0.25, 0.25, 0.25, 0.25]));
            }
            if (data.competitors && data.competitors.length > 0) {
              setCompetitors(data.competitors);
            }
            if (data.crowdCenters && data.crowdCenters.length > 0) {
              setCrowdCenters(data.crowdCenters);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch /api/layers/overview:', err);
      }
    }
    loadLayers();
  }, []);

  // Handle Pairwise Matrix Change
  const handlePairChange = (pairKey: string, value: number) => {
    setActivePreset(null);
    setPairs((prev) => ({
      ...prev,
      [pairKey]: value,
    }));
  };

  // Handle Preset Strategy Selection
  const handleApplyPreset = (presetId: string) => {
    const found = AHP_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setActivePreset(presetId);
      setPairs(found.pairs);
    }
  };

  // Handle TOPSIS Computation Trigger
  const runCalculation = async (active: AhpResult, activePairs: Record<string, number>) => {
    if (!active.isConsistent) return;
    setIsCalculating(true);

    try {
      const res = await fetch('/api/spatial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: active.weightsArray,
          pairs: activePairs,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.topsisResult) {
          setTopsisResult(data.topsisResult);
          const firstValid = data.topsisResult.candidates.find((c: TopsisCandidateResult) => !c.isRestricted) || data.topsisResult.candidates[0];
          if (firstValid) {
            setSelectedCandidate(firstValid);
          }
        }
      } else {
        const result = calculateTopsis(gridCandidates, active.weightsArray);
        setTopsisResult(result);
        const firstValid = result.candidates.find((c) => !c.isRestricted) || result.candidates[0];
        if (firstValid) {
          setSelectedCandidate(firstValid);
        }
      }

      // Re-evaluate survey point if active
      if (surveyResult) {
        // Bobot berubah, titik sama: pakai ulang kriteria yang sudah dihitung (tanpa query ulang)
        const storedCriteria: PointCriteria = surveyResult.isInsideBogor
          ? {
              inside: true,
              district: surveyResult.districtName ?? undefined,
              density: surveyResult.c2_density,
              c1: surveyResult.c1_dist_competitor,
              c1Name: surveyResult.nearestCompetitorName,
              c3: surveyResult.c3_dist_road,
              c3Name: surveyResult.nearestRoadName,
              c4: surveyResult.c4_dist_crowd,
              c4Name: surveyResult.nearestCrowdName,
            }
          : { inside: false };
        const updatedSurvey = evaluateSurveyLocation(
          surveyResult.lat,
          surveyResult.lng,
          active.weightsArray,
          gridCandidates,
          storedCriteria,
          exclusionZones
        );
        setSurveyResult(updatedSurvey);
      }

      setActiveTab('recommendations');
    } catch (err) {
      console.warn('API call fallback to local calculation:', err);
      const result = calculateTopsis(gridCandidates, active.weightsArray);
      setTopsisResult(result);
      const firstValid = result.candidates.find((c) => !c.isRestricted) || result.candidates[0];
      if (firstValid) {
        setSelectedCandidate(firstValid);
      }
      setActiveTab('recommendations');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCalculate = () => runCalculation(ahpResult, pairs);

  // Muat skenario tersimpan: atur ulang perbandingan berpasangan lalu hitung langsung dengan bobot itu
  const handleLoadScenario = (saved: Record<string, number>) => {
    const result = calculateAhp(buildAhpMatrix(saved));
    setActivePreset(null);
    setPairs(saved);
    if (result.isConsistent) runCalculation(result, saved);
  };

  // Reset to default balanced preset
  const handleReset = () => {
    handleApplyPreset('balanced');
    setFilters({ district: 'ALL', minScore: 0, category: 'all', excludeRestricted: true });
    const defaultRes = calculateTopsis(gridCandidates, [0.25, 0.25, 0.25, 0.25]);
    setTopsisResult(defaultRes);
    const firstValid = defaultRes.candidates.find((c) => !c.isRestricted) || defaultRes.candidates[0];
    setSelectedCandidate(firstValid ?? null);
    setSurveyResult(null);
    setIsSurveyClickMode(false);
  };

  const handleToggleLayer = (layerKey: keyof LayerToggleState) => {
    setLayers((prev) => {
      const val = prev[layerKey];
      if (typeof val === 'boolean') {
        return {
          ...prev,
          [layerKey]: !val,
        };
      }
      return prev;
    });
  };

  const handleUpdateLayers = (updated: Partial<LayerToggleState>) => {
    setLayers((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const handleFilterChange = (updated: Partial<FilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  // Field Survey Handlers
  const handleSurveyPointSelected = async (lat: number, lng: number) => {
    // C1..C4 titik survei dihitung database (PostGIS); jika tidak tersedia -> perhitungan lokal
    let criteria: PointCriteria | null = null;
    try {
      const res = await fetch(`/api/spatial/point?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        criteria = data.criteria ?? null;
      }
    } catch (err) {
      console.warn('Kriteria titik dari database tidak tersedia, memakai perhitungan lokal:', err);
    }
    const evalResult = evaluateSurveyLocation(
      lat,
      lng,
      ahpResult.weightsArray,
      gridCandidates,
      criteria,
      exclusionZones
    );
    setSurveyResult(evalResult);
    setIsSurveyModalOpen(true);
    setIsSurveyClickMode(false);
  };

  const handleToggleSurveyClickMode = () => {
    setIsSurveyClickMode((prev) => !prev);
  };

  const handleClearSurvey = () => {
    setSurveyResult(null);
    setIsSurveyClickMode(false);
  };

  const visibleCandidatesCount = useMemo(() => {
    return topsisResult.candidates.filter((c) => {
      if (filters.excludeRestricted && c.isRestricted) return false;
      if (c.score < filters.minScore) return false;
      if (filters.category !== 'all' && c.category !== filters.category) return false;
      if (filters.district !== 'ALL' && c.district.toLowerCase() !== filters.district.toLowerCase()) {
        return false;
      }
      return true;
    }).length;
  }, [topsisResult.candidates, filters]);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-oat font-sans text-ink">
      {/* Peta memenuhi layar; semua kontrol melayang di atasnya */}
      <main className="absolute inset-0">
        <MapWrapper
          districts={districts}
          competitors={competitors}
          roads={roads}
          crowdCenters={crowdCenters}
          exclusionZones={exclusionZones}
          candidates={topsisResult.candidates}
          layers={layers}
          filters={filters}
          selectedCandidate={selectedCandidate}
          onSelectCandidate={(c) => setSelectedCandidate(c)}
          // Field Survey Map Props
          surveyResult={surveyResult}
          onSurveyPointSelected={handleSurveyPointSelected}
          onOpenSurveyModal={() => setIsSurveyModalOpen(true)}
          onClearSurvey={handleClearSurvey}
          isSurveyClickMode={isSurveyClickMode}
          onToggleSurveyClickMode={handleToggleSurveyClickMode}
        />
      </main>

      {/* Header melayang */}
      <Header
        ahpResult={ahpResult}
        totalCompetitors={competitors.length}
        totalCandidates={topsisResult.candidates.length}
        dataSource={dataSource}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenInfo={() => {
          setActiveTab('info');
          setIsSidebarCollapsed(false);
        }}
        onReset={handleReset}
        onOpenSurvey={() => setActiveTab('survey')}
      />

      {/* Panel kerja: kartu melayang (desktop) / bottom sheet (mobile) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        pairs={pairs}
        onPairChange={handlePairChange}
        onApplyPreset={handleApplyPreset}
        activePreset={activePreset}
        ahpResult={ahpResult}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
        candidates={topsisResult.candidates}
        selectedCandidateId={selectedCandidate?.id ?? null}
        onSelectCandidate={(c) => setSelectedCandidate(c)}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        onUpdateLayers={handleUpdateLayers}
        filters={filters}
        onFilterChange={handleFilterChange}
        totalVisibleCandidates={visibleCandidatesCount}
        zoneCount={exclusionZones.length}
        onLoadScenario={handleLoadScenario}
        // Survey Props
        surveyResult={surveyResult}
        onSurveyPointSelected={handleSurveyPointSelected}
        onOpenSurveyModal={() => setIsSurveyModalOpen(true)}
        onClearSurvey={handleClearSurvey}
        isSurveyClickMode={isSurveyClickMode}
        onToggleSurveyClickMode={handleToggleSurveyClickMode}
      />

      {/* Skripsi Methodology & Academic Audit Modal */}
      <MethodologyAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        ahpResult={ahpResult}
        topsisResult={topsisResult}
      />

      {/* Live Field Survey Modal */}
      <SurveyLocationModal
        isOpen={isSurveyModalOpen}
        onClose={() => setIsSurveyModalOpen(false)}
        survey={surveyResult}
        onFocusMap={(lat, lng) => {
          setIsSurveyModalOpen(false);
        }}
        onNewSurvey={() => {
          setIsSurveyClickMode(true);
        }}
      />
    </div>
  );
}
