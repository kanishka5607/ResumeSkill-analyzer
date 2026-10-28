import React, { createContext, useContext, useState } from 'react';
import { ActiveEvaluation, GapReport } from '../types';

export interface SetActiveEvaluationOptions {
  analysisId?: number;
  gapReportId?: number;
  jobRoleId?: number | null;
  jobDescriptionId?: number | null;
  targetTitle?: string;
  targetType?: 'predefined_role' | 'saved_job_description' | 'custom_job_description';
}

interface ActiveEvaluationContextType {
  activeEvaluation: ActiveEvaluation | null;
  activeAnalysisId: number | null;
  activeGapReportId: number | null;
  targetTitle: string | null;
  targetType: 'predefined_role' | 'saved_job_description' | 'custom_job_description' | null;
  jobRoleId: number | null;
  jobDescriptionId: number | null;
  setActiveEvaluation: (evalData: ActiveEvaluation | GapReport | SetActiveEvaluationOptions | null) => void;
  clearActiveEvaluation: () => void;
}

const STORAGE_KEY = 'active_evaluation_state';

function loadPersistedEvaluation(): ActiveEvaluation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.analysisId === 'number' && typeof parsed.gapReportId === 'number') {
      return parsed as ActiveEvaluation;
    }
  } catch (e) {
    console.error('Failed to parse persisted active evaluation:', e);
  }
  return null;
}

function persistEvaluation(evalData: ActiveEvaluation | null) {
  try {
    if (evalData) {
      const serialized = JSON.stringify(evalData);
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to write active evaluation to storage:', e);
  }
}

const ActiveEvaluationContext = createContext<ActiveEvaluationContextType | undefined>(undefined);

export const ActiveEvaluationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEval, setActiveEval] = useState<ActiveEvaluation | null>(() => loadPersistedEvaluation());

  const setActiveEvaluation = (input: ActiveEvaluation | GapReport | SetActiveEvaluationOptions | null) => {
    if (!input) {
      setActiveEval(null);
      persistEvaluation(null);
      return;
    }

    let nextEval: ActiveEvaluation;

    if ('gap_items' in input || 'scoring_version' in input) {
      // It is a GapReport
      const report = input as GapReport;
      const title =
        report.job_role_title ||
        (report.job_role_id ? `Role #${report.job_role_id}` : (report.job_description_id ? `Custom Target #${report.job_description_id}` : 'Target Job'));
      const type: 'predefined_role' | 'saved_job_description' | 'custom_job_description' = report.job_role_id
        ? 'predefined_role'
        : (report.job_description_id ? 'saved_job_description' : 'custom_job_description');

      nextEval = {
        analysisId: report.analysis_id,
        gapReportId: report.id,
        jobRoleId: report.job_role_id || null,
        jobDescriptionId: report.job_description_id || null,
        targetTitle: title,
        targetType: type,
      };
    } else {
      const options = input as Partial<ActiveEvaluation>;
      if (typeof options.analysisId !== 'number' || typeof options.gapReportId !== 'number') {
        console.warn('Cannot set active evaluation without analysisId and gapReportId', input);
        return;
      }
      nextEval = {
        analysisId: options.analysisId,
        gapReportId: options.gapReportId,
        jobRoleId: options.jobRoleId ?? null,
        jobDescriptionId: options.jobDescriptionId ?? null,
        targetTitle: options.targetTitle || 'Target Role',
        targetType:
          options.targetType ||
          (options.jobRoleId ? 'predefined_role' : (options.jobDescriptionId ? 'saved_job_description' : 'custom_job_description')),
      };
    }

    setActiveEval(nextEval);
    persistEvaluation(nextEval);
  };

  const clearActiveEvaluation = () => {
    setActiveEval(null);
    persistEvaluation(null);
  };

  return (
    <ActiveEvaluationContext.Provider
      value={{
        activeEvaluation: activeEval,
        activeAnalysisId: activeEval?.analysisId ?? null,
        activeGapReportId: activeEval?.gapReportId ?? null,
        targetTitle: activeEval?.targetTitle ?? null,
        targetType: activeEval?.targetType ?? null,
        jobRoleId: activeEval?.jobRoleId ?? null,
        jobDescriptionId: activeEval?.jobDescriptionId ?? null,
        setActiveEvaluation,
        clearActiveEvaluation,
      }}
    >
      {children}
    </ActiveEvaluationContext.Provider>
  );
};

export const useActiveEvaluation = (): ActiveEvaluationContextType => {
  const context = useContext(ActiveEvaluationContext);
  if (!context) {
    throw new Error('useActiveEvaluation must be used within an ActiveEvaluationProvider');
  }
  return context;
};
