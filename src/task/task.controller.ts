import { Controller, HttpStatus } from '@nestjs/common';
import { TaskService } from './task.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  CreateTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  GetTaskRequest,
  UpdateTaskRequest,
  DeleteTaskRequest,
  Status as StatusProto,
  Task,
  ListTask,
  DeleteAllTasksResponse,
} from 'src/stubs/task/v1alpha/task';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task as TaskDto } from './dto/task.dto';
import { Status } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}
  // initialize array of Task objects
  private ListTask = ListTask.create();
  private tasks$ = new BehaviorSubject(this.ListTask); // emits the current value to new subscribers

  formatTaskDtoToTask(task: TaskDto) {
    return Task.create({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.toString(),
      status: StatusProto[task.status],
    });
  }

  formatTaskToUpdateTaskDto(task: Task) {
    const taskDto = new UpdateTaskDto();
    taskDto.title = task.title;
    taskDto.description = task.description;
    taskDto.dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
    taskDto.status = Status[StatusProto[task.status]];

    return taskDto;
  }

  async ListTasksStream(task, action: string) {
    const ListTasks = await this.ListTasks(ListTasksRequest.create());
    this.ListTask.tasks = ListTasks.tasks;
    this.ListTask.action = action;
    this.ListTask.taskInAction = task;
    this.tasks$.next(this.ListTask); // emit the new value to all subscribers
  }

  @GrpcMethod('TaskService')
  async createTask(data: CreateTaskRequest) {
    try {
      const newTask = data.task;

      const taskDto = new CreateTaskDto();
      taskDto.title = newTask.title;
      taskDto.description = newTask.description;
      if (newTask.dueDate) taskDto.dueDate = new Date(newTask.dueDate);

      const result = await this.taskService.create(taskDto);
      this.ListTasksStream(result, 'create');

      return result;
    } catch (error) {
      throw new RpcException({
        code: HttpStatus.BAD_REQUEST,
        message: error.message,
      });
    }
  }

  @GrpcMethod('TaskService')
  async GetTask(data: GetTaskRequest): Promise<Task | undefined> {
    const task = await this.taskService.findById(data.id);
    return this.formatTaskDtoToTask(task);
  }

  @GrpcMethod('TaskService')
  async UpdateTask(data: UpdateTaskRequest): Promise<Task> {
    console.log(data.task);

    const task = await this.taskService.update(
      data.task.id,
      this.formatTaskToUpdateTaskDto(data.task),
    );

    return this.formatTaskDtoToTask(task);
  }

  @GrpcMethod('TaskService')
  async DeleteTask(data: DeleteTaskRequest): Promise<Task> {
    const task = await this.taskService.remove(data.id);
    this.ListTasksStream(task, 'delete');
    return await this.formatTaskDtoToTask(task);
  }

  @GrpcMethod('TaskService')
  async DeleteAllTasks(): Promise<DeleteAllTasksResponse> {
    const result = await this.taskService.removeAll();
    return DeleteAllTasksResponse.create({ numberDeletedItems: result });
  }

  @GrpcMethod('TaskService')
  async ListTasks(request: ListTasksRequest): Promise<ListTasksResponse> {
    const tasks = await this.taskService.findAll();
    console.log({ tasks });

    const res = ListTasksResponse.create({
      tasks: tasks.map((t) => this.formatTaskDtoToTask(t)),
    });

    console.log({ res });

    return res;
  }

  @GrpcMethod('TaskService')
  async ListTasksPagination(
    request: ListTasksRequest,
  ): Promise<ListTasksResponse> {
    let tasks = [];

    const cursor = parseInt(request.parent);
    const pageSize = request.pageSize;

    // if no element requested
    if (pageSize <= 0) {
      throw new RpcException({
        code: HttpStatus.BAD_REQUEST,
        message: "Invalid 'parent' value",
      });
    }

    const lastTask = await this.taskService.findLast();

    // get tasks
    if (isNaN(cursor) || cursor <= 0) {
      tasks = await this.taskService.findAllWithPagination(0, pageSize);
    } else {
      tasks = await this.taskService.findAllWithPagination(cursor, pageSize);
    }

    // if parent is greater than last element
    if (tasks.length === 0) {
      throw new RpcException({
        code: HttpStatus.NOT_FOUND,
        message: 'No tasks found',
      });
    }

    const res = ListTasksResponse.create({
      nextPageToken:
        lastTask.id === tasks[tasks.length - 1].id
          ? null
          : tasks[tasks.length - 1].id.toString(),
      tasks: tasks.map((t) => this.formatTaskDtoToTask(t)),
    });

    return res;
  }

  @GrpcMethod('TaskService')
  StreamTasks(): Observable<any> {
    const observer = {
      next: (val) => console.log(val),
      error: (error) => console.log('Error to console:', error),
      complete: () => console.log('✅ Completed'),
    };

    this.tasks$.subscribe(observer);

    // send stream of tasks
    return this.tasks$.asObservable();
  }
}
