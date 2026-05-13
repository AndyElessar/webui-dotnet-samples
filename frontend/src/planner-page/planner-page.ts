import { WebUIElement, observable } from '@microsoft/webui-framework'

const plannerSlots = ['morning', 'afternoon', 'evening', 'done'] as const
const plannerFilters = ['all', 'open', 'completed', 'high'] as const

type PlannerSlot = typeof plannerSlots[number]
type PlannerFilter = typeof plannerFilters[number]
type PlannerStatusLabel = 'Completed' | 'Not Completed'
type TodoPriority = 'Normal' | 'High'
type SaveNoticeState = 'idle' | 'saving' | 'saved' | 'error'

interface PlannerTask {
  id: number
  title: string
  notes: string
  completed: boolean
  statusLabel: PlannerStatusLabel
  updatedAt: string
  slot: PlannerSlot
  priority: TodoPriority
  weatherFit: string
}

interface PlannerForecast {
  index: number
  label: string
  dateLabel: string
  temperatureC: number
  summary: string
  riskLevel: string
  tone: string
  recommendedSlot: PlannerSlot
}

interface PlannerTodoUpdateResponse {
  task: PlannerTask
}

function isPlannerSlot(value: string | undefined): value is PlannerSlot {
  return plannerSlots.some((slot) => slot === value)
}

function isPlannerFilter(value: string | undefined): value is PlannerFilter {
  return plannerFilters.some((filter) => filter === value)
}

function readDatasetInt(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : undefined
}

function getTaskStateForSlot(slot: PlannerSlot): Pick<PlannerTask, 'completed' | 'statusLabel'> {
  switch (slot) {
    case 'done':
      return { completed: true, statusLabel: 'Completed' }
    case 'morning':
    case 'afternoon':
    case 'evening':
      return { completed: false, statusLabel: 'Not Completed' }
  }
}

function matchesPlannerFilter(task: PlannerTask, filter: PlannerFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'open':
      return !task.completed
    case 'completed':
      return task.completed
    case 'high':
      return task.priority === 'High'
  }
}

export class PlannerPage extends WebUIElement {
  @observable tasks: PlannerTask[] = []
  @observable morningTasks: PlannerTask[] = []
  @observable afternoonTasks: PlannerTask[] = []
  @observable eveningTasks: PlannerTask[] = []
  @observable doneTasks: PlannerTask[] = []
  @observable forecasts: PlannerForecast[] = []
  @observable selectedForecast: PlannerForecast = {
    index: 0,
    label: 'Today',
    dateLabel: '',
    temperatureC: 0,
    summary: 'No forecast',
    riskLevel: 'Low',
    tone: 'focus',
    recommendedSlot: 'morning',
  }
  @observable totalCount = 0
  @observable openCount = 0
  @observable completedCount = 0
  @observable completionRate = 0
  @observable visibleCount = 0
  @observable generatedAt = ''
  @observable hydrationMessage = ''
  @observable selectedForecastIndex = 0
  @observable filter: PlannerFilter = 'all'
  @observable query = ''
  @observable draggedTaskId = 0
  @observable interactionCount = 0
  @observable lastAction = 'Waiting for hydration'
  @observable saveNoticeState: SaveNoticeState = 'idle'
  @observable saveNoticeLabel = 'Sync ready'
  @observable saveNoticeMessage = 'Move a task to sync it with the server.'

  private saveVersions = new Map<number, number>()

  private get filteredTasks(): PlannerTask[] {
    const query = this.query.trim().toLowerCase()

    return this.tasks.filter((task) => {
      const matchesQuery = query.length === 0
        || task.title.toLowerCase().includes(query)
        || task.notes.toLowerCase().includes(query)
        || task.weatherFit.toLowerCase().includes(query)
      const matchesFilter = matchesPlannerFilter(task, this.filter)

      return matchesQuery && matchesFilter
    })
  }

  selectForecast(index: number): void {
    this.selectedForecastIndex = index
    this.selectedForecast = this.forecasts.find((forecast) => forecast.index === index) ?? this.selectedForecast
    this.bump(`Forecast changed to ${this.selectedForecast.label}`)
  }

  selectForecastFromEvent(event: Event): void {
    const index = readDatasetInt((event.currentTarget as HTMLElement).dataset.index)

    if (index === undefined) {
      return
    }

    this.selectForecast(index)
  }

  setFilter(filter: PlannerFilter): void {
    this.filter = filter
    this.refreshBoard()
    this.bump(`Filter set to ${filter}`)
  }

  setFilterFromEvent(event: Event): void {
    const filter = (event.currentTarget as HTMLElement).dataset.filter

    if (!isPlannerFilter(filter)) {
      return
    }

    this.setFilter(filter)
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value
    this.refreshBoard()
    this.bump('Local search updated')
  }

  startDrag(event: DragEvent): void {
    const taskId = readDatasetInt((event.currentTarget as HTMLElement).dataset.taskId)

    if (taskId === undefined || taskId === 0) {
      return
    }

    this.draggedTaskId = taskId
    this.lastAction = 'Dragging task'
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault()
  }

  dropInto(slot: PlannerSlot, event: DragEvent): void {
    event.preventDefault()

    if (this.draggedTaskId === 0) {
      return
    }

    this.moveTask(this.draggedTaskId, slot)
    this.draggedTaskId = 0
  }

  dropIntoFromEvent(event: DragEvent): void {
    const slot = (event.currentTarget as HTMLElement).dataset.slot

    if (!isPlannerSlot(slot)) {
      return
    }

    this.dropInto(slot, event)
  }

  moveTask(id: number, slot: PlannerSlot): void {
    const task = this.tasks.find((currentTask) => currentTask.id === id)

    if (!task) {
      return
    }

    const updatedTask = {
      ...task,
      ...getTaskStateForSlot(slot),
      slot,
    }

    this.setTasks(this.tasks.map((currentTask) => currentTask.id === id ? updatedTask : currentTask))
    this.bump(`Moved task to ${slot}`)
    void this.saveTask(updatedTask)
  }

  moveTaskFromEvent(event: Event): void {
    const target = event.currentTarget as HTMLElement
    const id = readDatasetInt(target.dataset.taskId)
    const slot = target.dataset.slot

    if (id === undefined || !isPlannerSlot(slot)) {
      return
    }

    this.moveTask(id, slot)
  }

  smartPlan(): void {
    const recommendedSlot = this.selectedForecast.recommendedSlot
    const changedTasks: PlannerTask[] = []

    this.setTasks(this.tasks.map((task, index) => {
      if (task.completed) {
        return task
      }

      const slot = task.priority === 'High'
        ? recommendedSlot
        : index % 2 === 0 ? 'afternoon' : 'evening'

      const updatedTask = { ...task, ...getTaskStateForSlot(slot), slot }
      changedTasks.push(updatedTask)
      return updatedTask
    }))
    this.bump(`Replanned around ${this.selectedForecast.summary}`)

    for (const task of changedTasks) {
      void this.saveTask(task)
    }
  }

  private async saveTask(task: PlannerTask): Promise<void> {
    const saveVersion = (this.saveVersions.get(task.id) ?? 0) + 1
    this.saveVersions.set(task.id, saveVersion)
    this.setSaveNotice('saving', 'Saving change', `Syncing "${task.title}" to the server.`)

    try {
      const response = await fetch(`/planner/todos/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: task.slot,
          priority: task.priority,
        }),
      })

      if (!response.ok) {
        throw new Error(`Planner save failed with ${response.status}`)
      }

      const result = await response.json() as PlannerTodoUpdateResponse

      if (this.saveVersions.get(task.id) !== saveVersion) {
        return
      }

      this.replaceTask(result.task)
      this.setSaveNotice('saved', 'Saved', `"${result.task.title}" is saved on the server.`)
      this.lastAction = `Saved ${result.task.statusLabel.toLowerCase()} state`
    } catch (error: unknown) {
      console.error(error)

      if (this.saveVersions.get(task.id) === saveVersion) {
        this.setSaveNotice('error', 'Save failed', `"${task.title}" changed here, but the server did not save it. Try the move again.`)
        this.lastAction = 'Server save failed'
      }
    }
  }

  private setSaveNotice(state: SaveNoticeState, label: string, message: string): void {
    this.saveNoticeState = state
    this.saveNoticeLabel = label
    this.saveNoticeMessage = message
  }

  private refreshBoard(): void {
    const filteredTasks = this.filteredTasks
    const completedCount = this.tasks.filter((task) => task.completed).length

    this.morningTasks = filteredTasks.filter((task) => task.slot === 'morning')
    this.afternoonTasks = filteredTasks.filter((task) => task.slot === 'afternoon')
    this.eveningTasks = filteredTasks.filter((task) => task.slot === 'evening')
    this.doneTasks = filteredTasks.filter((task) => task.slot === 'done')
    this.visibleCount = filteredTasks.length
    this.totalCount = this.tasks.length
    this.completedCount = completedCount
    this.openCount = this.tasks.length - completedCount
    this.completionRate = this.tasks.length === 0 ? 0 : Math.round(completedCount * 100 / this.tasks.length)
  }

  private setTasks(tasks: PlannerTask[]): void {
    this.tasks = tasks
    this.refreshBoard()
  }

  private replaceTask(task: PlannerTask): void {
    this.setTasks(this.tasks.map((current) => current.id === task.id ? task : current))
  }

  private bump(action: string): void {
    this.interactionCount += 1
    this.lastAction = action
  }
}

PlannerPage.define('planner-page')