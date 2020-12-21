# 2exec
A super simple and reliable shell execution library.
* [Documentation](https://doc.deno.land/https/deno.land/x/2exec/mod.ts)

## Features
- [x] `&&`, `||` and `&` support
- [ ] `|` support
- [ ] `>` support
- [ ] Directory changes (e.g. `cd /tmp/ && ls`)

## Example usage
```typescript
import { exec } from "https://deno.land/x/2exec/mod.ts";

const processes = await exec("ps -aux");
```

## Options
```typescript
// exec(command, options);
//               ^
const options = {
    //                  Default
    ignoreErrors:       false,
    log:                false
}
```
