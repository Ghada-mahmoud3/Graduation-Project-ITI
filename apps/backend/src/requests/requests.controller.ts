import { Controller, Post, Get, Patch, Put, Body, Param, Query, UseGuards, Request, ValidationPipe } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRequestDto, UpdateRequestStatusDto } from '../dto/request.dto';
import { RequestStatus } from '../schemas/patient-request.schema';

@Controller('api/requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  async createRequest(
    @Body(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(error => {
          const constraints = error.constraints;
          return constraints ? Object.values(constraints).join(', ') : 'Validation error';
        });
        console.log('❌ Validation errors:', messages);
        return new Error(`Validation failed: ${messages.join('; ')}`);
      }
    })) createRequestDto: CreateRequestDto,
    @Request() req : any
  ) {
    console.log('🔍 Controller createRequest called');
    console.log('🔍 req.user:', req.user);
    console.log('🔍 createRequestDto:', createRequestDto);
    return this.requestsService.createRequest(createRequestDto, req.user);
  }

  @Get()
  async getRequests(@Request() req : any, @Query('status') status?: RequestStatus) {
    return this.requestsService.getRequests(req.user, status);
  }

  @Get('dashboard/stats')
  async getDashboardStats(@Request() req : any) {
    return this.requestsService.getDashboardStats(req.user);
  }

  @Get(':id')
  async getRequestById(@Param('id') requestId: string, @Request() req : any) {
    return this.requestsService.getRequestById(requestId, req.user);
  }

  @Patch(':id/status')
  async updateRequestStatus(
    @Param('id') requestId: string,
    @Body(ValidationPipe) updateStatusDto: UpdateRequestStatusDto,
    @Request() req : any
  ) {
    return this.requestsService.updateRequestStatus(requestId, updateStatusDto, req.user);
  }

  @Put(':id/status')
  async updateRequestStatusPut(
    @Param('id') requestId: string,
    @Body() body: { status: string },
    @Request() req : any
  ) {
    return this.requestsService.updateRequestStatus(requestId, { status: body.status as RequestStatus }, req.user);
  }

  @Put(':id/complete-nurse')
  async markCompletedByNurse(
    @Param('id') requestId: string,
    @Request() req : any
  ) {
    return this.requestsService.markCompletedByNurse(requestId, req.user);
  }

  @Put(':id/complete-patient')
  async markCompletedByPatient(
    @Param('id') requestId: string,
    @Request() req : any
  ) {
    return this.requestsService.markCompletedByPatient(requestId, req.user);
  }
}
