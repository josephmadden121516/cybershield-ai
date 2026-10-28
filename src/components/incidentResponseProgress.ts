export interface IncidentResponseScenarioProgress {
  scenarioTitle: string
  completedSteps: string[]
  totalSteps: number
}

export interface IncidentResponseProgress {
  scenarios: IncidentResponseScenarioProgress[]
  storageError: boolean
}
