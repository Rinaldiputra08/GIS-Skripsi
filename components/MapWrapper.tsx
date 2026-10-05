'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
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
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-xs font-medium">Memuat Peta Spasial Kota Bogor...</span>
      </div>
    ),
  }
);

interface MapWrapperProps {
  districts: DistrictGeo[];
  competitors: CompetitorPoint[];
  roads: RoadSegment[];
  crowdCenters: CrowdCenterPoint[];
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
