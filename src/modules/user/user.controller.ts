import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

class CreateUserDto {
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    password: string;

    @IsEmail()
    @IsOptional() // Mark email as optional
    email: string;
}

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    async create(@Body() user: CreateUserDto) {
        return this.userService.create(user);
    }

    @Get()
    async findAll() {
        return this.userService.findAll();
    }
}