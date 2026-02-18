import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

const mockCommentsService = {
  create: jest.fn(),
  findAllByCard: jest.fn(),
  remove: jest.fn(),
  getAttachmentDownloadUrl: jest.fn(),
};

describe('CommentsController', () => {
  let controller: CommentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: mockCommentsService }],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });
});
