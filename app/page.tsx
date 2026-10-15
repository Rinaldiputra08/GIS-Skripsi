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
} from '@/data/bogor-spatial';
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
  SurveyPointEvaluation,
} from '@/lib/types';

export default function Home() {
  // 1. Spatial Entities State (loaded from Supabase or embedded defaults)
  const [competitors, setCompetitors] = useState<CompetitorPoint[]>(BOGOR_COMPETITORS);
  const [crowdCenters, setCrowdCenters] = useState<CrowdCenterPoint[]>(BOGOR_CROWD_CENTERS);
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
    showRoads: true,
    showCrowdCenters: true,
    showRecommendations: true,
    showHeatmap: true,
    showExclusionZones: true,
    recommendationDisplayMode: 'both',
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
            setDataSource(data.source);
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
  const handleCalculate = async () => {
    if (!ahpResult.isConsistent) return;
    setIsCalculating(true);

    try {
      const res = await fetch('/api/spatial/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights: ahpResult.weightsArray,
          pairs,
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
        const result = calculateTopsis(BOGOR_GRID_CANDIDATES, ahpResult.weightsArray);
        setTopsisResult(result);
        const firstValid = result.candidates.find((c) => !c.isRestricted) || result.candidates[0];
        if (firstValid) {
          setSelectedCandidate(firstValid);
        }
      }

      // Re-evaluate survey point if active
      if (surveyResult) {
        const updatedSurvey = evaluateSurveyLocation(
          surveyResult.lat,
          surveyResult.lng,
          ahpResult.weightsArray,
          BOGOR_GRID_CANDIDATES
        );
        setSurveyResult(updatedSurvey);
      }

      setActiveTab('recommendations');
    } catch (err) {
      console.warn('API call fallback to local calculation:', err);
      const result = calculateTopsis(BOGOR_GRID_CANDIDATES, ahpResult.weightsArray);
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

  // Reset to default balanced preset
  const handleReset = () => {
    handleApplyPreset('balanced');
    setFilters({ district: 'ALL', minScore: 0, category: 'all', excludeRestricted: true });
    const defaultRes = calculateTopsis(BOGOR_GRID_CANDIDATES, [0.25, 0.25, 0.25, 0.25]);
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
  const handleSurveyPointSelected = (lat: number, lng: number) => {
    const evalResult = evaluateSurveyLocation(
      lat,
      lng,
      ahpResult.weightsArray,
      BOGOR_GRID_CANDIDATES
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Header Navigation */}
      <Header
        ahpResult={ahpResult}
        totalCompetitors={competitors.length}
        totalCandidates={topsisResult.candidates.length}
        onOpenAudit={() => setIsAuditModalOpen(true)}
        onOpenInfo={() => setActiveTab('info')}
        onReset={handleReset}
        onOpenSurvey={() => setActiveTab('survey')}
      />

      {/* Main Workspace: Sidebar + Map */}
      <div className="flex flex-1 w-full h-[calc(100vh-57px)] overflow-hidden relative">
        {/* Sidebar Panel */}
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
          // Survey Props
          surveyResult={surveyResult}
          onSurveyPointSelected={handleSurveyPointSelected}
          onOpenSurveyModal={() => setIsSurveyModalOpen(true)}
          onClearSurvey={handleClearSurvey}
          isSurveyClickMode={isSurveyClickMode}
          onToggleSurveyClickMode={handleToggleSurveyClickMode}
        />

        {/* Web-GIS Map Canvas */}
        <main className="flex-1 h-full w-full relative">
          <MapWrapper
            districts={BOGOR_DISTRICTS}
            competitors={competitors}
            roads={BOGOR_ROADS}
            crowdCenters={crowdCenters}
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
      </div>

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
