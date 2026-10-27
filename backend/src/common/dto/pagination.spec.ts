import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { paginate } from './paginated-response.dto';
import { PaginationQueryDto } from './pagination-query.dto';

describe('Pagination', () => {
  it('uses defaults and converts query strings to numbers', async () => {
    const query = plainToInstance(PaginationQueryDto, { page: '3' });

    expect(await validate(query)).toHaveLength(0);
    expect(query.page).toBe(3);
    expect(query.limit).toBe(10);
    expect(query.order).toBe('desc');
    expect(query.skip).toBe(20);
  });

  it('rejects a limit above 100', async () => {
    const query = plainToInstance(PaginationQueryDto, { limit: '500' });

    expect(await validate(query)).not.toHaveLength(0);
  });

  it('builds the meta block', () => {
    const result = paginate(['a', 'b'], 25, { page: 2, limit: 10 });

    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });
});
