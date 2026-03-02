import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('budgets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget for a category' })
  @ApiCreatedResponse({ description: 'Budget created' })
  create(@Body() dto: CreateBudgetDto, @CurrentUser() user: JwtPayload) {
    return this.budgetsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all budgets for the current user' })
  @ApiOkResponse({ description: 'List of budgets' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.budgetsService.findAll(user.sub);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get budget status: spending vs. budget amount' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Budget status with spending breakdown' })
  getStatus(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.budgetsService.getStatus(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Budget updated' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.budgetsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Budget deleted' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.budgetsService.remove(id, user.sub);
  }
}
