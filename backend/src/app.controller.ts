import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import type { CPMInputDto } from './cmp/cmp.types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus() {
    return this.appService.getStatus();
  }

  @Post('cpm')
  calculateCpm(@Body() input: CPMInputDto) {
    return this.appService.calculateCpm(input);
  }
}
