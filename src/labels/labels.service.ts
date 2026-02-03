import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
    constructor(private prisma: PrismaService) { }

    async create(createLabelDto: CreateLabelDto) {
        const { boardId, ...data } = createLabelDto;
        // Verify board exists
        const board = await this.prisma.board.findUnique({ where: { id: boardId } });
        if (!board) throw new NotFoundException('Board not found');

        return this.prisma.label.create({
            data: {
                ...data,
                boardId,
            },
        });
    }

    findAllByBoard(boardId: string) {
        return this.prisma.label.findMany({
            where: { boardId },
        });
    }

    async findOne(id: string) {
        const label = await this.prisma.label.findUnique({
            where: { id },
        });
        if (!label) throw new NotFoundException('Label not found');
        return label;
    }

    async update(id: string, updateLabelDto: UpdateLabelDto) {
        await this.findOne(id); // Ensure exists
        return this.prisma.label.update({
            where: { id },
            data: updateLabelDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Ensure exists
        return this.prisma.label.delete({
            where: { id },
        });
    }
}
