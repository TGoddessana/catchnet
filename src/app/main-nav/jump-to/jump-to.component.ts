import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

export interface JumpTarget {
  label: string;
  /** Short group name shown on the right, e.g. "Page" or "Project". */
  kind: string;
  icon: string;
  route: (string | null)[];
  queryParams?: Record<string, string>;
}

/**
 * Quick navigation opened from the sidebar's "Jump to" button or ⌘K / Ctrl+K.
 * Type to filter, arrow keys to move, Enter to go.
 */
@Component({
  selector: "gt-jump-to",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="jump">
      <label class="jump__field">
        <mat-icon aria-hidden="true" svgIcon="search"></mat-icon>
        <span class="u-visually-hidden" i18n>Jump to a page or project</span>
        <input
          #input
          class="jump__input"
          type="text"
          role="combobox"
          aria-controls="jump-results"
          [attr.aria-activedescendant]="'jump-' + active()"
          aria-expanded="true"
          autocomplete="off"
          i18n-placeholder
          placeholder="Jump to a page or project"
          [value]="query()"
          (input)="onInput(input.value)"
          (keydown)="onKeydown($event)"
          autofocus
        />
      </label>
      <ul class="jump__list" id="jump-results" role="listbox">
        @for (t of results(); track t.kind + t.label; let i = $index) {
          <li
            [id]="'jump-' + i"
            role="option"
            class="jump__item"
            [class.is-active]="i === active()"
            [attr.aria-selected]="i === active()"
            (mouseenter)="active.set(i)"
            (click)="go(t)"
          >
            <mat-icon aria-hidden="true" [svgIcon]="t.icon"></mat-icon>
            <span class="jump__label">{{ t.label }}</span>
            <span class="jump__kind">{{ t.kind }}</span>
          </li>
        } @empty {
          <li class="jump__empty" i18n>Nothing matches “{{ query() }}”.</li>
        }
      </ul>
    </div>
  `,
  styles: `
    .jump {
      width: min(560px, calc(100vw - 32px));
      padding: var(--gt-space-2);
    }
    .jump__field {
      display: flex;
      align-items: center;
      gap: var(--gt-space-2);
      height: var(--gt-control-height);
      padding: 0 var(--gt-space-3);
      border-radius: var(--gt-radius-control);
      background: var(--gt-color-subtle);
      color: var(--gt-color-text-3);
    }
    .jump__input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      font-size: 15px;
      color: var(--gt-color-text-1);
    }
    .jump__input::placeholder {
      color: var(--gt-color-text-3);
    }
    .jump__list {
      list-style: none;
      margin: var(--gt-space-2) 0 0;
      padding: 0;
      max-height: 360px;
      overflow-y: auto;
    }
    .jump__item {
      display: flex;
      align-items: center;
      gap: var(--gt-space-3);
      height: var(--gt-control-height);
      padding: 0 var(--gt-space-3);
      border-radius: var(--gt-radius-control);
      color: var(--gt-color-text-2);
      cursor: pointer;
    }
    .jump__item.is-active {
      background: var(--gt-color-accent-soft);
      color: var(--gt-color-accent-text);
    }
    .jump__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: var(--gt-weight-medium);
      color: inherit;
    }
    .jump__kind {
      font-size: 12px;
      color: var(--gt-color-text-3);
    }
    .jump__item.is-active .jump__kind {
      color: inherit;
    }
    .jump__empty {
      padding: var(--gt-space-4) var(--gt-space-3);
      color: var(--gt-color-text-3);
    }
  `,
})
export class JumpToComponent {
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<JumpToComponent>);
  private targets = inject<JumpTarget[]>(MAT_DIALOG_DATA);

  query = signal("");
  active = signal(0);

  results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.targets;
    }
    return this.targets.filter(
      (t) =>
        t.label.toLowerCase().includes(q) || t.kind.toLowerCase().includes(q),
    );
  });

  onInput(value: string) {
    this.query.set(value);
    this.active.set(0);
  }

  onKeydown(event: KeyboardEvent) {
    const count = this.results().length;
    if (event.key === "ArrowDown" && count) {
      event.preventDefault();
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      this.active.update((i) => (i - 1 + count) % count);
    } else if (event.key === "Enter") {
      const target = this.results()[this.active()];
      if (target) {
        event.preventDefault();
        this.go(target);
      }
    }
  }

  go(target: JumpTarget) {
    this.dialogRef.close();
    this.router.navigate(target.route, { queryParams: target.queryParams });
  }
}
