export type CPMNodeDto = {
  id: string;
};

export type CPMActivityDto = {
  id: string;
  from: string;
  to: string;
  duration: number;
  name?: string;
};

export type CPMInputDto = {
  nodes: CPMNodeDto[];
  activities: CPMActivityDto[];
};
