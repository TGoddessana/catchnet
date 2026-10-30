import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Shared empty state: the block keeps its frame (a dashed outline) and says
 * what is missing in one line, with the next action beside it. Every empty
 * list, table or panel uses it, so every empty state reads the same. Project
 * a single button for the action. Set headingLevel to match the surrounding
 * page so the title lands in the right place in the heading outline. The
 * icon input is kept for existing callers but no longer drawn: a big grey
 * pictogram in an empty box read as decoration, not information.
 */
@Component({
  selector: "gt-empty-state",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="empty-state">
      <div class="empty-state__text">
        <p
          class="empty-state__title"
          role="heading"
          [attr.aria-level]="headingLevel()"
        >
          {{ title() }}
        </p>
        @if (message()) {
          <p class="empty-state__message">{{ message() }}</p>
        }
      </div>
      <span class="empty-state__action"><ng-content></ng-content></span>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--gt-space-3, 12px);
      padding: var(--gt-space-4, 16px) 20px;
      border: 1px dashed var(--gt-color-control);
      border-radius: var(--gt-radius-card);
    }
    .empty-state__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .empty-state__title {
      margin: 0;
      font-size: 14px;
      line-height: 20px;
      font-weight: var(--gt-weight-medium);
      color: var(--gt-color-text-1);
    }
    .empty-state__message {
      margin: 0;
      max-width: 60ch;
      font-size: 14px;
      line-height: 20px;
      color: var(--gt-color-text-2);
    }
    .empty-state__action:empty {
      display: none;
    }
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>("");
  readonly title = input.required<string>();
  readonly message = input<string>("");
  readonly headingLevel = input<number>(3);
}
