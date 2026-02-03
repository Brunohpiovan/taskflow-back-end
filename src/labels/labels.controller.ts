import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('labels')
@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
    constructor(private readonly labelsService: LabelsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new label' })
    create(@Body() createLabelDto: CreateLabelDto) {
        return this.labelsService.create(createLabelDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all labels for a board' })
    findAll(@Query('boardId') boardId: string) {
        return this.labelsService.findAllByBoard(boardId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.labelsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLabelDto: UpdateLabelDto) {
        return this.labelsService.update(id, updateLabelDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.labelsService.remove(id);
    }
}
