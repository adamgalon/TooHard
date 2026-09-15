/**
 * A single, serialisable error shape shared by every layer.
 *
 * Infrastructure translates platform exceptions into an `AppError`; the
 * presentation layer only ever switches on `code`, never on a stack trace.
 */
export type AppErrorCode =
  | 'STORAGE_READ_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'DATA_CORRUPTED'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'ILLEGAL_STATE'
  | 'CANCELLED'
  | 'UNEXPECTED';

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

const make =
  (code: AppErrorCode) =>
  (message: string, options?: { cause?: unknown; details?: Record<string, unknown> }): AppError => ({
    code,
    message,
    ...(options?.cause !== undefined ? { cause: options.cause } : {}),
    ...(options?.details !== undefined ? { details: options.details } : {}),
  });

export const AppErrors = {
  storageRead: make('STORAGE_READ_FAILED'),
  storageWrite: make('STORAGE_WRITE_FAILED'),
  corrupted: make('DATA_CORRUPTED'),
  notFound: make('NOT_FOUND'),
  validation: make('VALIDATION_FAILED'),
  permissionDenied: make('PERMISSION_DENIED'),
  illegalState: make('ILLEGAL_STATE'),
  cancelled: make('CANCELLED'),
  unexpected: make('UNEXPECTED'),
} as const;

export const describeError = (error: AppError): string => error.message;

export const toAppError = (cause: unknown, fallbackMessage = 'Something went wrong.'): AppError => {
  if (isAppError(cause)) return cause;
  if (cause instanceof Error) return AppErrors.unexpected(cause.message, { cause });
  return AppErrors.unexpected(fallbackMessage, { cause });
};

export const isAppError = (value: unknown): value is AppError =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value &&
  typeof (value as AppError).message === 'string';
