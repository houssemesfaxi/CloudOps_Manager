import { PaginationQueryDto } from './pagination-query.dto';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Response shape for every list endpoint: { data, meta }. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Builds the { data, meta } response from one page of rows and the total count.
 * Usage in a service:
 *   const [rows, total] = await Promise.all([findMany(...), count(...)]);
 *   return paginate(rows, total, query);
 */
export function paginate<T>(
  data: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'limit'>,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
