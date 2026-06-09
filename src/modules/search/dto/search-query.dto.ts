import { MinLength, MaxLength, IsInt, Min, Max } from 'class-validator';

export class SearchQueryDto {
  @MinLength(1, { message: 'Query string must not be empty' })
  @MaxLength(200, { message: 'Query string must not exceed 200 characters' })
  q: string;

  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page: number = 1;

  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit: number = 20;
}
