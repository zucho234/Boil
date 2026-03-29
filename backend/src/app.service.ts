import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateCPM } from './cmp/cmp.algorithm';
import type { CPMInputDto } from './cmp/cmp.types';

@Injectable()
export class AppService {
  getStatus() {
    return {
      name: 'CPM API',
      status: 'ok',
    };
  }

  calculateCpm(input: CPMInputDto) {
    this.validateInput(input);

    try {
      return calculateCPM(input);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid CPM input.';

      throw new BadRequestException(message);
    }
  }

  private validateInput(input: CPMInputDto): void {
    if (!input || !Array.isArray(input.nodes) || !Array.isArray(input.activities)) {
      throw new BadRequestException(
        'Request body must include "nodes" and "activities" arrays.',
      );
    }

    if (input.nodes.length === 0) {
      throw new BadRequestException('At least one node is required.');
    }

    const invalidNode = input.nodes.find(
      (node) => !node || typeof node.id !== 'string' || node.id.trim().length === 0,
    );
    if (invalidNode) {
      throw new BadRequestException('Each node must have a non-empty string "id".');
    }

    const invalidActivity = input.activities.find(
      (activity) =>
        !activity ||
        typeof activity.id !== 'string' ||
        activity.id.trim().length === 0 ||
        typeof activity.from !== 'string' ||
        activity.from.trim().length === 0 ||
        typeof activity.to !== 'string' ||
        activity.to.trim().length === 0 ||
        typeof activity.duration !== 'number' ||
        Number.isNaN(activity.duration),
    );

    if (invalidActivity) {
      throw new BadRequestException(
        'Each activity must include non-empty "id", "from", "to" and numeric "duration".',
      );
    }
  }
}
