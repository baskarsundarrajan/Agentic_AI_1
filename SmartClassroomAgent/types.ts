export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export interface Classroom {
  classid: string;
  capacity: number;
  equipments: string;
  type: string;
}

export interface Course {
  coursecode: string;
  coursename: string;
}

export interface Faculty {
  facultyid: string;
  facultyname: string;
  dept: string;
}

export type ScheduleStatus = 'Scheduled' | 'Pending' | 'Conflict' | 'No Room';

export interface ScheduleEntry {
  day: string;
  timeslot: string;
  classroomid: string;
  faculty: string;
  coursecode: string;
  programme: string;
  semester: string;
  status: ScheduleStatus;
}
