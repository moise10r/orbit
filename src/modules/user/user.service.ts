import { Injectable, ConflictException } from '@nestjs/common';
import { User } from './entities/user.entity'; 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validateOrReject } from 'class-validator';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {}

    async create(user: Partial<User>): Promise<User> {
        const existingUser = await this.usersRepository.findOne({ where: [{ username: user.username }, { email: user.email }] });
        if (existingUser) {
            throw new ConflictException(existingUser.username === user.username ? 'Username already exists' : 'Email already exists');
        }

        const newUser = this.usersRepository.create(user);
        await validateOrReject(newUser);
        await newUser.hashPassword(); // Ensure password is hashed before saving
        return this.usersRepository.save(newUser);
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }
}