import { makeAutoObservable } from "mobx";

export class ViewModel {
  flows: FlowMeta[] = [];
  solutions: SolutionMeta[] = [];
  selectedSolution: SolutionMeta | null = null;
  selectedFlows: FlowMeta[] | null = null;
  coOwners: OwnerMeta[] = [];
  theme: string = "light";
  constructor() {
    makeAutoObservable(this);
  }
}

export class SolutionMeta {
  name: string;
  uniqueName: string;
  id: string;
  managed: boolean = false;

  constructor(name: string, uniqueName: string, id: string, managed: boolean) {
    this.name = name;
    this.uniqueName = uniqueName;
    this.id = id;
    this.managed = managed;
    makeAutoObservable(this);
  }
}

export class FlowMeta {
  name: string;
  id: string;
  ownerName: string;
  ownerId: string;
  type: string;
  category: string;
  description: string;
  createdBy: string;
  state: string;
  solutions: SolutionMeta[] = [];
  coOwners: OwnerMeta[] = [];
  flowDefinition: string;
  private _cachedTriggerText?: string;

  constructor(
    name: string,
    id: string,
    ownerName: string,
    ownerId: string,
    type: string,
    category: string,
    description: string,
    createdBy: string,
    state: string,
    flowDefinition: string,
  ) {
    this.name = name;
    this.id = id;
    this.ownerName = ownerName;
    this.ownerId = ownerId;
    this.type = type;
    this.category = category;
    this.description = description;
    this.createdBy = createdBy;
    this.state = state;
    this.flowDefinition = flowDefinition;
    makeAutoObservable(this);
  }

  getTriggerText(): string {
    if (this._cachedTriggerText !== undefined) {
      return this._cachedTriggerText;
    }

    try {
      const definition =
        typeof this.flowDefinition === "string" ? JSON.parse(this.flowDefinition) : this.flowDefinition;

      // Check if triggers exist in definition.definition.triggers or definition.triggers
      const triggers = definition?.properties?.definition?.triggers || definition?.triggers;
      
      if (triggers && typeof triggers === "object") {
        const triggerNames = Object.keys(triggers);
        if (triggerNames.length > 0) {
          this._cachedTriggerText = triggerNames[0]; // Cache the first trigger name
          return this._cachedTriggerText;
        }
      }
      this._cachedTriggerText = "No Trigger";
      return this._cachedTriggerText;
    } catch (error) {
      this._cachedTriggerText = "Error Reading Trigger";
      return this._cachedTriggerText;
    }
  }
}

export class OwnerMeta {
  name: string;
  id: string;
  type: "user" | "team";

  constructor(name: string, id: string, type: "user" | "team") {
    this.name = name;
    this.id = id;
    this.type = type;
    makeAutoObservable(this);
  }
}
