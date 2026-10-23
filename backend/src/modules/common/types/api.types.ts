// HTTP_STATUS and HttpStatus are imported for type references in other files

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    name: string;
    details?: any;
    stack?: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  count?: number,
  pagination?: ApiSuccessResponse<T>['pagination']
): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  if (count !== undefined) {
    response.count = count;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
}

export function createErrorResponse(
  message: string,
  error?: ApiErrorResponse['error']
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    message,
  };

  if (error) {
    response.error = error;
  }

  return response;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface SearchQuery {
  search?: string;
}

export interface FilterQuery {
  [key: string]: string | number | boolean | undefined;
}

export type QueryParams = PaginationQuery & SearchQuery & FilterQuery;

export interface RequestWithQuery<T extends QueryParams = QueryParams> {
  query: T;
}

export interface RequestWithBody<T = any> {
  body: T;
}

export interface RequestWithParams<T = any> {
  params: T;
}

export type TypedRequest<_T = any> = RequestWithQuery & RequestWithBody & RequestWithParams;