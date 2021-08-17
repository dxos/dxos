import { AppSimulator } from './AppSimulator';
import { Browser } from './Browser';
import { PartyModule } from './PartyModule';
import { ProfileModule } from './ProfileModule';

export class TaskApp extends AppSimulator {
  party: PartyModule;
  profile: ProfileModule;

  constructor(browser: Browser) {
    super(browser);

    this.party = new PartyModule(browser);
    this.profile = new ProfileModule(browser);
  }

  async checkAppIsLoaded() {
    const header = await this.browser.getPage().waitForSelector('text="Tasks App"', { timeout: 5000 });

    expect(header).toBeDefined();
  }

  async createTaskList(listName: string) {
    await this.browser.getPage().click('button[title="Create list"]');

    const createListModal = await this.browser.getPage().$('h2 :text("Create List")');

    expect(createListModal).toBeDefined();

    await this.browser.getPage().fill('input:above(:text("Create"))', listName);

    await this.browser.getPage().click('button :text("Create")');

    const createdList = await this.browser.getPage().waitForSelector(`text="${listName}"`)

    expect(createdList).toBeDefined();
  }

  async checkTaskListIsCreated(listName: string) {
    const createdList = await this.browser.getPage().$(`text="${listName}"`)

    expect(createdList).toBeDefined();

    return Boolean(createdList)
  }


  async createTask(listName: string, taskName: string) {
    await this.browser.getPage().click(`li :text("${listName}")`);

    await this.browser.getPage().fill('input', taskName);

    await this.browser.getPage().click('[aria-label="create"]');

    await this.checkTaskIsCreated(taskName);
  }

  async checkTaskIsCreated(taskName: string) {
    const createdTask = await this.browser.getPage().$(`text="${taskName}"`);

    expect(createdTask).toBeDefined();
  }

  async swapTaskState(taskName: string) {
    const taskCheckbox = await this.browser.getPage().$(`input:left-of(:text("${taskName}"))`);

    expect(taskCheckbox).toBeDefined();

    await taskCheckbox?.check();

    await this.checkTaskState(taskName, true);

    await taskCheckbox?.uncheck();

    await this.checkTaskState(taskName, false);
  }

  async checkTaskState(taskName: string, expectedResult: boolean) {
    const taskCheckbox = await this.browser.getPage().$(`input:left-of(:text("${taskName}"))`);

    expect(taskCheckbox).toBeDefined();

    console.debug('is checkbox found', Boolean(taskCheckbox));

    if (taskCheckbox) {
      const result = await taskCheckbox?.isChecked();
      console.debug({ result, expectedResult });
      expectedResult ? expect(result).toBeTruthy() : expect(result).toBeFalsy();
    } else {
      console.debug('not found', taskCheckbox);
      console.debug('selector', `input:left-of(:text("${taskName}"))`);
      console.debug('selector', `input:left-of(:text("${taskName}"))`);
      this.browser.getPage().waitForSelector(`input:left-of(:text("${taskName}"))`).then(checkBox => console.debug('found?', checkBox));
      expect(false).toBeTruthy();
    }
  }

  async removeTask(taskName: string) {
    const taskTrash = await this.browser.getPage().$(`button:right-of(:text("${taskName}"))`);

    expect(taskTrash).toBeDefined();

    await taskTrash?.click();

    await this.checkTaskExistence(taskName);
  }

  async checkTaskExistence(taskName: string) {
    const task = await this.browser.getPage().$(`text="${taskName}"`);

    expect(task).toBeNull();
  }

}
