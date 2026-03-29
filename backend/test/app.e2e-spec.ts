import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { sampleCPMInput } from './../src/cmp/cmp.samples';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let httpApp: ReturnType<INestApplication['getHttpAdapter']>['getInstance'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    httpApp = app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(httpApp).get('/').expect(200).expect({
      name: 'CPM API',
      status: 'ok',
    });
  });

  it('/cpm (POST)', async () => {
    const response = await request(httpApp)
      .post('/cpm')
      .send(sampleCPMInput)
      .expect(201);

    expect(response.body.projectDuration).toBe(7);
    expect(response.body.criticalActivities).toEqual(['A', 'C']);
    expect(response.body.activities).toEqual(
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
      ]),
    );
  });

  it('/cpm (POST) should reject invalid payload', () => {
    return request(httpApp)
      .post('/cpm')
      .send({
        nodes: [{ id: '1' }],
        activities: [{ id: 'A', from: '1', to: '2', duration: 1 }],
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Activity "A" references a missing node.');
      });
  });
});
