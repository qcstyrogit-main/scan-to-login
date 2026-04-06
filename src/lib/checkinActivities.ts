export type ProcessingMode = 'offline' | 'online';

const PROCESSING_REMARKS: Record<ProcessingMode, string> = {
  offline: 'Processed offline',
  online: 'Processed online',
};

const PROCESSING_REMARK_PATTERN = /\n*\s*Processed (offline|online)\s*$/i;

export const stripProcessingRemark = (value?: string): string => {
  if (!value) return '';
  return value.replace(PROCESSING_REMARK_PATTERN, '').trim();
};

export const buildActivitiesWithProcessingRemark = (
  value: string | undefined,
  processingMode: ProcessingMode
): string => {
  const baseValue = stripProcessingRemark(value);
  const remark = PROCESSING_REMARKS[processingMode];
  return baseValue ? `${baseValue}\n\n${remark}` : remark;
};
