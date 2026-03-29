import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { sampleCPMInput } from './cmp/cmp.samples';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API status', () => {
      expect(appController.getStatus()).toEqual({
        name: 'CPM API',
        status: 'ok',
      });
    });

    it('should calculate CPM result', () => {
      const result = appController.calculateCpm(sampleCPMInput);

      expect(result.projectDuration).toBe(7);
      expect(result.criticalActivities).toEqual(['A', 'C']);
      expect(result.activities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'A',
            ES: 0,
            EF: 3,
            LS: 0,
            LF: 3,
            totalFloat: 0,
            isCritical: true,
          }),
          expect.objectContaining({
            id: 'B',
            ES: 0,
            EF: 2,
            LS: 4,
            LF: 6,
            totalFloat: 4,
            isCritical: false,
          }),
        ]),
      );
    });
  });
});
