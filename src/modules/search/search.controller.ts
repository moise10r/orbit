import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PaginatedSearchResultsDto } from './dto/search-result.dto';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';

// AuthGuard is not implemented in this codebase and is not referenced.

export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  async search(
    projectId: string,
    query: SearchQueryDto,
  ): Promise<PaginatedSearchResultsDto> {
    const validatedQuery = plainToClass(SearchQueryDto, query);
    await validateOrReject(validatedQuery);
    return this.searchService.search(projectId, validatedQuery);
  }
}
