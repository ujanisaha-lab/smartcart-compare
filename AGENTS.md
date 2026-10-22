<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Product/store catalog lives in src/lib/catalog.ts as deterministic demo data; swap for a real price feed behind the same shape.
- User data (profiles, user_stores, price_alerts) is in Lovable Cloud with per-user RLS; queries are in src/lib/data.ts.
