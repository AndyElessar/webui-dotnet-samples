import { WebUIElement, observable } from '@microsoft/webui-framework'

export class EditorialHero extends WebUIElement {
  @observable count = 0

  increment() {
    this.count += 1
  }
}

EditorialHero.define('editorial-hero')