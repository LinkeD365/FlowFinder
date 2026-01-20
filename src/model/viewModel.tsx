import { makeAutoObservable } from "mobx";

export class ViewModel {
  flows: FlowMeta[] = [];
  solutions: SolutionMeta[] = [];
  selectedSolution: SolutionMeta | null = null;
  selectedFlow: FlowMeta | null = null;
  constructor() {
    makeAutoObservable(this);
  }
}

export class SolutionMeta {
  name: string;
  uniqueName: string;
  id: string;

  constructor(name: string, uniqueName: string, id: string) {
    this.name = name;
    this.uniqueName = uniqueName;
    this.id = id;
    makeAutoObservable(this);
  }
}

export class FlowMeta {
  name: string;
  id: string;
  ownerId: string;
  type: string;
  category: string;
  description: string;
  createdBy: string;
  state: string;

  constructor(
    name: string,
    id: string,
    ownerId: string,
    type: string,
    category: string,
    description: string,
    createdBy: string,
    state: string,
  ) {
    this.name = name;
    this.id = id;
    this.ownerId = ownerId;
    this.type = type;
    this.category = category;
    this.description = description;
    this.createdBy = createdBy;
    this.state = state;
    makeAutoObservable(this);
  }
}
