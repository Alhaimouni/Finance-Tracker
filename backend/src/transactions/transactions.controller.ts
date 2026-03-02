import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('transactions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiCreatedResponse({ description: 'Transaction created' })
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters, sorting, and pagination' })
  @ApiOkResponse({ description: 'Paginated list of transactions' })
  findAll(@Query() query: QueryTransactionDto, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.findAll(query, user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get income/expense summary for a date range' })
  @ApiOkResponse({ description: 'Transaction summary' })
  getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.getSummary(user.sub, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Transaction found' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.findById(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ description: 'Transaction updated' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Transaction deleted' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.transactionsService.remove(id, user.sub);
  }
}
