export type SearchResultType = 'task' | 'decision';

export class SearchResultDto {
  id: string;
  type: SearchResultType;
  title: string;
  snippet: string;
  score: number;
}

export class PaginatedSearchResultsDto {
  results: SearchResultDto[];
  total: number;
  page: number;
  limit: number;
}
