import { Controller, Get, Patch, Param, Query, UseGuards, Request, ValidationPipe } from '@nestjs/common';
import { NursesService } from './nurses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../schemas/user.schema';
import { GetNearbyNursesDto } from '../dto/request.dto';

@Controller('api/nurses')
export class NursesController {
  constructor(private readonly nursesService: NursesService) {}

  @Get('nearby')
  async getNearbyNurses(@Query(new ValidationPipe({ transform: true })) getNearbyNursesDto: GetNearbyNursesDto) {
    return this.nursesService.getNearbyNurses(getNearbyNursesDto);
  }

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NURSE)
  async getAvailability(@Request() req: any) {
    // This is just to ensure the route exists for GET requests
    return { isAvailable: req.user.isAvailable || false };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  async getNurseStats(@Param('id') nurseId: string) {
    console.log('🎯 NursesController.getNurseStats called with ID:', nurseId);
    return this.nursesService.getNurseStats(nurseId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getNurseById(@Param('id') nurseId: string) {
    console.log('🎯 NursesController.getNurseById called with ID:', nurseId);
    return this.nursesService.getNurseById(nurseId);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async verifyNurse(@Param('id') nurseId: string, @Request() req : any) {
    return this.nursesService.verifyNurse(nurseId, req.user);
  }

  @Patch('availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.NURSE)
  async toggleAvailability(@Request() req : any) {
    return this.nursesService.toggleAvailability(req.user);
  }
}
