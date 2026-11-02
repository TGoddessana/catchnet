# Phase 0 results

## claude-claude-haiku-5-5

- resolved: **11/12**
- agent time: median 65s, max 138s
- cost: total $2.82, mean $0.23, max $0.45

| task | resolved | f2p | p2p | cost | tokens in/cached/out | time | diff/gold lines |
|---|---|---|---|---|---|---|---|
| django__django-11964 | ✅ | True | True | $0.15 | 12149/44113/3836 | 40s | 16/8 |
| django__django-14016 | ✅ | True | True | $0.20 | 11584/99633/6040 | 49s | 18/7 |
| django__django-14017 | ✅ | True | True | $0.45 | 23005/280485/13860 | 92s | 19/2 |
| django__django-15202 | ❌ | False | True | $0.35 | 19434/149557/11212 | 75s | 7/13 |
| django__django-15814 | ✅ | True | True | $0.20 | 14209/101206/5637 | 73s | 21/1 |
| django__django-16255 | ✅ | True | True | $0.17 | 14334/79044/4194 | 42s | 35/2 |
| pytest-dev__pytest-7168 | ✅ | True | True | $0.33 | 22629/170084/9277 | 65s | 17/2 |
| sympy__sympy-18621 | ✅ | True | True | $0.28 | 15620/108762/8985 | 97s | 23/2 |
| sympy__sympy-20590 | ✅ | True | True | $0.11 | 6481/50528/3448 | 65s | 10/5 |
| sympy__sympy-22005 | ✅ | True | True | $0.18 | 10238/59420/5773 | 48s | 12/6 |
| sympy__sympy-22714 | ✅ | True | True | $0.21 | 12937/87678/6611 | 138s | 16/2 |
| sympy__sympy-24213 | ✅ | True | True | $0.18 | 10131/64431/5975 | 43s | 23/2 |

## claude-claude-opus-5-5

- resolved: **11/12**
- agent time: median 54s, max 387s
- cost: total $1.35, mean $0.11, max $0.22

| task | resolved | f2p | p2p | cost | tokens in/cached/out | time | diff/gold lines |
|---|---|---|---|---|---|---|---|
| django__django-11964 | ✅ | True | True | $0.08 | 7162/26755/2012 | 35s | 14/8 |
| django__django-14016 | ✅ | True | True | $0.13 | 8146/49415/3791 | 57s | 25/7 |
| django__django-14017 | ✅ | True | True | $0.11 | 7366/31420/3468 | 46s | 24/2 |
| django__django-15202 | ❌ | False | True | $0.22 | 13957/122533/6078 | 92s | 12/13 |
| django__django-15814 | ✅ | True | True | $0.21 | 13616/116981/6076 | 98s | 10/1 |
| django__django-16255 | ✅ | True | True | $0.10 | 7553/39886/2720 | 47s | 35/2 |
| pytest-dev__pytest-7168 | ✅ | True | True | $0.10 | 8876/42579/2585 | 42s | 19/2 |
| sympy__sympy-18621 | ✅ | True | True | $0.07 | 5289/25046/1953 | 35s | 11/2 |
| sympy__sympy-20590 | ✅ | True | True | $0.07 | 4525/22436/2092 | 54s | 12/5 |
| sympy__sympy-22005 | ✅ | True | True | $0.12 | 6359/45199/3791 | 387s | 12/6 |
| sympy__sympy-22714 | ✅ | True | True | $0.06 | 3709/17308/1786 | 73s | 14/2 |
| sympy__sympy-24213 | ✅ | True | True | $0.09 | 5527/29926/2674 | 52s | 21/2 |

## claude-claude-sonnet-5-5

- resolved: **11/12**
- agent time: median 29s, max 62s
- cost: total $0.40, mean $0.03, max $0.07

| task | resolved | f2p | p2p | cost | tokens in/cached/out | time | diff/gold lines |
|---|---|---|---|---|---|---|---|
| django__django-11964 | ✅ | True | True | $0.02 | 5283/7822/785 | 16s | 12/8 |
| django__django-14016 | ✅ | True | True | $0.03 | 3382/21826/1470 | 30s | 13/7 |
| django__django-14017 | ✅ | True | True | $0.07 | 8077/68583/3210 | 57s | 20/2 |
| django__django-15202 | ❌ | False | True | $0.03 | 3622/11832/1436 | 23s | 17/13 |
| django__django-15814 | ✅ | True | True | $0.03 | 4108/19511/1302 | 25s | 7/1 |
| django__django-16255 | ✅ | True | True | $0.03 | 5387/28311/1419 | 31s | 12/2 |
| pytest-dev__pytest-7168 | ✅ | True | True | $0.03 | 6637/22169/1203 | 19s | 17/2 |
| sympy__sympy-18621 | ✅ | True | True | $0.03 | 4513/20417/1741 | 29s | 13/2 |
| sympy__sympy-20590 | ✅ | True | True | $0.02 | 2964/14442/1279 | 26s | 5/5 |
| sympy__sympy-22005 | ✅ | True | True | $0.05 | 7177/47897/2724 | 62s | 6/6 |
| sympy__sympy-22714 | ✅ | True | True | $0.03 | 3669/16520/1371 | 35s | 9/2 |
| sympy__sympy-24213 | ✅ | True | True | $0.03 | 3495/12875/1526 | 24s | 20/2 |

## codex-gpt-6.1-sol

- resolved: **11/12**
- agent time: median 62s, max 120s

| task | resolved | f2p | p2p | cost | tokens in/cached/out | time | diff/gold lines |
|---|---|---|---|---|---|---|---|
| django__django-11964 | ✅ | True | True | - | 222518/205184/1939 | 66s | 10/8 |
| django__django-14016 | ✅ | True | True | - | 166014/143104/2325 | 66s | 22/7 |
| django__django-14017 | ✅ | True | True | - | 351872/307584/3982 | 120s | 42/2 |
| django__django-15202 | ❌ | False | True | - | 165897/147968/1992 | 62s | 16/13 |
| django__django-15814 | ✅ | True | True | - | 311738/286976/2383 | 82s | 27/1 |
| django__django-16255 | ✅ | True | True | - | 221263/200064/1712 | 50s | 9/2 |
| pytest-dev__pytest-7168 | ✅ | True | True | - | 160249/142720/1833 | 38s | 19/2 |
| sympy__sympy-18621 | ✅ | True | True | - | 191953/170880/1459 | 48s | 10/2 |
| sympy__sympy-20590 | ✅ | True | True | - | 188851/176128/1708 | 58s | 8/5 |
| sympy__sympy-22005 | ✅ | True | True | - | 154382/128384/1427 | 48s | 10/6 |
| sympy__sympy-22714 | ✅ | True | True | - | 223474/201472/2107 | 63s | 15/2 |
| sympy__sympy-24213 | ✅ | True | True | - | 198523/180864/2059 | 53s | 24/2 |
