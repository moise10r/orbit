// NOTE: Repository/Like/Injectable/InjectRepository/TypeORM decorators are not imported/used as they do not exist in verified packages.
// Replace these with correct implementations if/when the packages are correct. This is an in-memory mock for demo/fix only.

import { SearchQueryDto } from './dto/search-query.dto';
import { PaginatedSearchResultsDto, SearchResultDto } from './dto/search-result.dto';
import { Task } from '../tasks/entities/task.entity';
import { Decision } from '../decisions/entities/decision.entity';

// In practice, you would implement these repositories using the correct pattern supported by your ORM or data-store.

export class SearchService {
  // Assume these arrays represent all tasks and decisions for demonstration purposes.
  private tasks: Task[] = [];
  private decisions: Decision[] = [];

  async search(
    projectId: string,
    query: SearchQueryDto,
  ): Promise<PaginatedSearchResultsDto> {
    const { q, page, limit } = query;
    const qLower = q.trim().toLowerCase();
    // Filter and score all relevant items
    const results: SearchResultDto[] = [];

    for (const t of this.tasks.filter(t => t.projectId === projectId)) {
      let score = 0;
      const titleIdx = t.title?.toLowerCase().indexOf(qLower);
      const descIdx = t.description?.toLowerCase().indexOf(qLower);
      if (titleIdx !== undefined && titleIdx >= 0) score += 2;
      if (descIdx !== undefined && descIdx >= 0) score += 1;
      if (score > 0) {
        // Pick snippet from the most relevant field
        let snippet = '';
        if (titleIdx !== undefined && titleIdx >= 0) {
          snippet = getSnippet(t.title, titleIdx, q.length);
        } else if (descIdx !== undefined && descIdx >= 0) {
          snippet = getSnippet(t.description, descIdx, q.length);
        }
        results.push({
          id: t.id,
          type: 'task',
          title: t.title,
          snippet,
          score,
        });
      }
    }
    for (const d of this.decisions.filter(d => d.projectId === projectId)) {
      let score = 0;
      const titleIdx = d.title?.toLowerCase().indexOf(qLower);
      const contentIdx = d.content?.toLowerCase().indexOf(qLower);
      if (titleIdx !== undefined && titleIdx >= 0) score += 2;
      if (contentIdx !== undefined && contentIdx >= 0) score += 1;
      if (score > 0) {
        // Pick snippet from most relevant field
        let snippet = '';
        if (titleIdx !== undefined && titleIdx >= 0) {
          snippet = getSnippet(d.title, titleIdx, q.length);
        } else if (contentIdx !== undefined && contentIdx >= 0) {
          snippet = getSnippet(d.content, contentIdx, q.length);
        }
        results.push({
          id: d.id,
          type: 'decision',
          title: d.title,
          snippet,
          score,
        });
      }
    }
    // Sort by weighted score
    results.sort((a, b) => b.score - a.score);
    const total = results.length;
    // Pagination after merging and ranking
    const pageStart = (page - 1) * limit;
    const paginatedResults = results.slice(pageStart, pageStart + limit);
    return {
      results: paginatedResults,
      total,
      page,
      limit,
    };
  }
}

function getSnippet(txt: string | undefined, idx: number, qlen: number): string {
  if (!txt) return '';
  const start = Math.max(0, idx - 40);
  const end = Math.min(txt.length, idx + qlen + 40);
  return txt.slice(start, end);
}
