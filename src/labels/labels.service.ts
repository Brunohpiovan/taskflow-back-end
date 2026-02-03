import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
    constructor(private prisma: PrismaService) { }

    async create(createLabelDto: CreateLabelDto) {
        const { environmentId, ...data } = createLabelDto;
        // Verify environment exists
        const environment = await this.prisma.environment.findUnique({ where: { id: environmentId } });
        if (!environment) throw new NotFoundException('Environment not found');

        return this.prisma.label.create({
            data: {
                ...data,
                environmentId,
            },
        });
    }

    findAllByEnvironment(environmentId: string) {
        return this.prisma.label.findMany({
            where: { environmentId },
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
