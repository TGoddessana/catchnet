import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatRadioModule } from "@angular/material/radio";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AutofixService, AutofixSettingsIn } from "src/app/api/autofix.service";
import { OrganizationsService } from "src/app/api/organizations.service";
import { LoadingButtonComponent } from "src/app/shared/loading-button/loading-button.component";

type Mode = AutofixSettingsIn["mode"];

const MODES: { value: Mode; label: string; text: string }[] = [
  {
    value: "off",
    label: $localize`Off`,
    text: $localize`catchnet does not write fixes for this project.`,
  },
  {
    value: "manual",
    label: $localize`When someone asks`,
    text: $localize`A Write a fix button appears on each issue.`,
  },
  {
    value: "auto",
    label: $localize`Automatically`,
    text: $localize`New errors get a fix without anyone asking, within the daily limit below.`,
  },
];

@Component({
  selector: "gt-project-autofix",
  templateUrl: "./project-autofix.html",
  styleUrls: ["./project-autofix.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    LoadingButtonComponent,
  ],
})
export class ProjectAutofix {
  private autofix = inject(AutofixService);
  private snackbar = inject(MatSnackBar);
  canWriteProject = inject(OrganizationsService).canWriteProject;

  orgSlug = input.required<string>();
  projectSlug = input.required<string>();

  modes = MODES;
  saving = signal(false);
  error = signal("");

  form = new FormGroup({
    mode: new FormControl<Mode>("off", { nonNullable: true }),
    repository: new FormControl("", {
      nonNullable: true,
      validators: [Validators.pattern(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)],
    }),
    defaultBranch: new FormControl("main", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    agent: new FormControl<"claude" | "codex">("claude", { nonNullable: true }),
    minEvents: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1)],
    }),
    dailyLimit: new FormControl(5, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(100)],
    }),
    codeRoot: new FormControl("", { nonNullable: true }),
  });

  private formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  mode = computed(() => this.formValue().mode);
  needsRepository = computed(
    () => this.mode() !== "off" && !this.formValue().repository,
  );

  settings = resource({
    params: () => ({ org: this.orgSlug(), project: this.projectSlug() }),
    loader: ({ params }) =>
      this.autofix.getSettings(params.org, params.project),
  });

  constructor() {
    effect(() => {
      const value = this.settings.value();
      if (!value) return;
      this.form.reset({
        mode: value.mode as Mode,
        repository: value.repository ?? "",
        defaultBranch: value.defaultBranch ?? "main",
        agent: value.agent as "claude" | "codex",
        minEvents: value.minEvents ?? 1,
        dailyLimit: value.dailyLimit ?? 5,
        codeRoot: value.codeRoot ?? "",
      });
    });
  }

  async save() {
    if (this.form.invalid || this.needsRepository()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set("");
    try {
      await this.autofix.saveSettings(
        this.orgSlug(),
        this.projectSlug(),
        this.form.getRawValue(),
      );
      this.settings.reload();
      this.snackbar.open($localize`Autofix settings saved.`);
    } catch (err: unknown) {
      this.error.set(
        (err as { detail?: string })?.detail ||
          $localize`Could not save. Check the fields and try again.`,
      );
    } finally {
      this.saving.set(false);
    }
  }
}
