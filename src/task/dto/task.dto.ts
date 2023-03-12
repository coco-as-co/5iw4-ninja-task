import { Status } from '@prisma/client';

export class Task {
  id: number;
  title: string;
  description: string;
  dueDate: Date | string;
  status: Status;
}
