export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = {
  handle: (error: unknown) => {
    if (error instanceof AppError) {
      logger.error(`[${error.code}] ${error.message}`);
      return error;
    }

    logger.error('Unexpected error:', error);
    return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred');
  },
};
