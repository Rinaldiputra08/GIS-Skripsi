'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
  ExclusionZone,
  TopsisCandidateResult,
  LayerToggleState,
  FilterState,
  SurveyPointEvaluation,
} from '@/lib/types';

const DynamicBogorMap = dynamic(
  () => import('./BogorMap').then((mod) => mod.BogorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-oat text-ink-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line-2 border-t-espresso" />
        <span className="text-sm font-semibold">Memuat peta Kota Bogor…</span>
      </div>
    ),
  }
);

interface MapWrapperProps {
  districts: DistrictGeo[];
  competitors: CompetitorPoint[];
  roads: RoadSegment[];
  crowdCenters: CrowdCenterPoint[];
  exclusionZones: ExclusionZone[];
  candidates: TopsisCandidateResult[];
  layers: LayerToggleState;
  filters: FilterState;
  selectedCandidate: TopsisCandidateResult | null;
  onSelectCandidate: (candidate: TopsisCandidateResult) => void;
  // Field Survey Props
  surveyResult?: SurveyPointEvaluation | null;
  onSurveyPointSelected?: (lat: number, lng: number) => void;
  onOpenSurveyModal?: () => void;
  onClearSurvey?: () => void;
  isSurveyClickMode?: boolean;
  onToggleSurveyClickMode?: () => void;
}

export const MapWrapper: React.FC<MapWrapperProps> = (props) => {
  return <DynamicBogorMap {...props} />;
};
