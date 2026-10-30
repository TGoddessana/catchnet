import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { AutofixService, fixStatus } from "src/app/api/autofix.service";
import { DaysAgoPipe } from "src/app/shared/days-ago.pipe";

@Component({
  selector: "gt-fixes",
  templateUrl: "./fixes.html",
  styleUrls: ["./fixes.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, DatePipe, DaysAgoPipe],
})
export class Fixes {
  private autofix = inject(AutofixService);
  orgSlug = input.required<string>({ alias: "org-slug" });

  fixes = resource({
    params: () => ({ org: this.orgSlug() }),
    loader: ({ params }) => this.autofix.listFixes(params.org, 100),
  });
  usage = resource({
    params: () => ({ org: this.orgSlug() }),
    loader: ({ params }) => this.autofix.usage(params.org, 30),
  });

  /** Share of finished runs that ended in a pull request. */
  prRate = computed(() => {
    const u = this.usage.value();
    if (!u) return null;
    const settled = u.prsOpened + u.noFix + u.failed;
    return settled ? Math.round((u.prsOpened / settled) * 100) : null;
  });

  status = fixStatus;

  cost(value: string | null | undefined) {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    return n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;
  }
}
