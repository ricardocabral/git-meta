/*
 * Copyright (c) 2016, Two Sigma Open Source
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of git-meta nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

const assert  = require("chai").assert;
const colors  = require("colors");

const Rebase              = require("../../lib/util/rebase");
const RepoStatus          = require("../../lib/util/repo_status");
const PrintStatusUtil     = require("../../lib/util/print_status_util");

describe("PrintStatusUtil", function () {
    const FILESTATUS       = RepoStatus.FILESTATUS;
    const RELATION         = RepoStatus.Submodule.COMMIT_RELATION;
    const StatusDescriptor = PrintStatusUtil.StatusDescriptor;
    const Submodule        = RepoStatus.Submodule;
    const Commit           = Submodule.Commit;
    const Index            = Submodule.Index;
    const Workdir          = Submodule.Workdir;

    describe("StatusDescriptor", function () {
        describe("constructor", function () {
            it("breathing", function () {
                const descriptor = new StatusDescriptor(FILESTATUS.ADDED,
                                                        "foo",
                                                        "bar");
                assert.equal(descriptor.status, FILESTATUS.ADDED);
                assert.equal(descriptor.path, "foo");
                assert.equal(descriptor.detail, "bar");
            });
        });
        describe("print", function () {
            const cases = {
                "basic": {
                    des: new StatusDescriptor(FILESTATUS.ADDED, "foo", "bar"),
                    check: /foo.*bar/,
                },
                "added": {
                    des: new StatusDescriptor(FILESTATUS.ADDED, "x", "y"),
                    check: /^new file/,
                },
                "modified": {
                    des: new StatusDescriptor(FILESTATUS.MODIFIED, "x", "y"),
                    check: /^modified/,
                },
                "deleted": {
                    des: new StatusDescriptor(FILESTATUS.REMOVED, "x", "y"),
                    check: /^deleted/,
                },
                "conflicted": {
                    des: new StatusDescriptor(FILESTATUS.CONFLICTED, "x", "y"),
                    check: /^conflicted/,
                },
                "renamed": {
                    des: new StatusDescriptor(FILESTATUS.RENAMED, "x", "y"),
                    check: /^renamed/,
                },
                "type changed": {
                    des: new StatusDescriptor(FILESTATUS.TYPECHANGED,
                                              "x",
                                              "y"),
                    check: /^type changed/,
                },
                "with color": {
                    des: new StatusDescriptor(FILESTATUS.TYPECHANGED,
                                              "x",
                                              "y"),
                    color: text => `RED${text}RED`,
                    check: /RED.*RED/,
                },
                "with cwd": {
                    des: new StatusDescriptor(FILESTATUS.ADDED, "x", "y"),
                    cwd: "q",
                    check: /\.\.\/x/,
                },
            };
            Object.keys(cases).forEach(caseName => {
                const c = cases[caseName];
                it(caseName, function () {
                    let color = c.color;
                    if (undefined === color) {
                        color = x => x;
                    }
                    let cwd = c.cwd;
                    if (undefined === cwd) {
                        cwd = "";
                    }
                    const result = c.des.print(color, cwd);
                    assert.match(result, c.check);
                });
            });
        });
    });

    describe("sortDescriptorsByPath", function () {
        const cases = {
            "trivial": {
                input: [],
                expected: [],
            },
            "one": {
                input: [new StatusDescriptor(FILESTATUS.ADDED, "x", "y")],
                expected: [new StatusDescriptor(FILESTATUS.ADDED, "x", "y")],
            },
            "a few": {
                input: [
                    new StatusDescriptor(FILESTATUS.ADDED, "b", "b"),
                    new StatusDescriptor(FILESTATUS.ADDED, "a", "a"),
                    new StatusDescriptor(FILESTATUS.ADDED, "z", "z"),
                    new StatusDescriptor(FILESTATUS.ADDED, "y", "y"),
                    new StatusDescriptor(FILESTATUS.ADDED, "q", "q"),
                    new StatusDescriptor(FILESTATUS.ADDED, "s", "s"),
                ],
                expected: [
                    new StatusDescriptor(FILESTATUS.ADDED, "a", "a"),
                    new StatusDescriptor(FILESTATUS.ADDED, "b", "b"),
                    new StatusDescriptor(FILESTATUS.ADDED, "q", "q"),
                    new StatusDescriptor(FILESTATUS.ADDED, "s", "s"),
                    new StatusDescriptor(FILESTATUS.ADDED, "y", "y"),
                    new StatusDescriptor(FILESTATUS.ADDED, "z", "z"),
                ],
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const result = PrintStatusUtil.sortDescriptorsByPath(c.input);
                assert.deepEqual(result, c.expected);
            });
        });
    });

    describe("printStatusDescriptors", function () {
        // This function is implemented in terms of `StatusDescriptor.print`,
        // so we just need to test a few things: basic function, sorting, and
        // coloring.

        const cases = {
            "trivial": {
                descriptors: [],
                check: /^$/
            },
            "one": {
                descriptors: [
                    new StatusDescriptor(FILESTATUS.ADDED, "x", "y"),
                ],
                check: /new.*x.*y.*\n$/,
            },
            "color": {
                descriptors: [
                    new StatusDescriptor(FILESTATUS.ADDED, "x", "y"),
                ],
                color: x => `BLUE${x}BLUE`,
                check: /BLUE/,
            },
            "order": {
                descriptors: [
                    new StatusDescriptor(FILESTATUS.ADDED, "Z", "y"),
                    new StatusDescriptor(FILESTATUS.ADDED, "X", "y"),
                ],
                check: /X.*\n.*Z/,
            },
            "cwd": {
                descriptors: [
                    new StatusDescriptor(FILESTATUS.ADDED, "Z/q", "y"),
                ],
                cwd: "Z",
                check: /\sq/,
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const color = c.color || (x => x);
                const cwd = c.cwd || "";
                const result = PrintStatusUtil.printStatusDescriptors(
                                                                 c.descriptors,
                                                                 color,
                                                                 cwd);
                assert.match(result, c.check);
            });
        });
    });

    describe("printUntrackedFiles", function () {
        const cases = {
            "trivial": {
                input: [],
                check: /^$/,
            },
            "one": {
                input: ["foo"],
                check: /\tfoo\n/,
            },
            "two": {
                input: ["foo", "bar"],
                check: /\tbar\n\tfoo\n/,
            },
            "in color": {
                input: ["foo"],
                color: (x => `a${x}b`),
                check: /\tafoob\n/,
            },
            "relative": {
                input: ["foo"],
                cwd: "bar",
                check: /\t\.\.\/foo\n/,
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const cwd = c.cwd || "";
                const color = c.color || (x => x);
                const result =
                      PrintStatusUtil.printUntrackedFiles(c.input, color, cwd);
                assert.match(result, c.check);
            });
        });
    });

    describe("getRelationDescription", function () {
        const RELATION = RepoStatus.Submodule.COMMIT_RELATION;
        const cases = {
            "ahead": {
                input: RELATION.AHEAD,
                expected: "new commits",
            },
            "behind": {
                input: RELATION.BEHIND,
                expected: "on old commit",
            },
            "unrelated": {
                input: RELATION.UNRELATED,
                expected: "on unrelated commit",
            },
            "unknown": {
                input: RELATION.UNKNOWN,
                expected: "on unknown commit",
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const result = PrintStatusUtil.getRelationDescription(c.input);
                assert.equal(result, c.expected);
            });
        });
    });

    describe("listSubmoduleDescriptors", function () {
        const cases = {
            "trivial": {
                status: new RepoStatus(),
            },
            "deleted": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("1", "a"),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.REMOVED, "x", "submodule"),
                ],
            },
            "new url": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("y", "a"),
                            index: new Index("y", "y", RELATION.SAME),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, new url"),
                ],
            },
            "new commits in index and new url": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("z", "a"),
                            index: new Index("y", "b", RELATION.AHEAD),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, new url, new commits"),
                ],
            },
            "new commits in index": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("z", "a"),
                            index: new Index("y", "a", RELATION.AHEAD),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, new commits"),
                ],
            },
            "new commits in workdir": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("y", "a"),
                            index: new Index("y", "a", RELATION.SAME),
                            workdir: new Workdir(new RepoStatus({
                                headCommit: "z",
                            }), RELATION.AHEAD),
                        }),
                    },
                }),
                workdir: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, new commits"),
                ],
            },
            "new commits in index and workdir": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("y", "a"),
                            index: new Index("z", "a", RELATION.AHEAD),
                            workdir: new Workdir(new RepoStatus({
                                headCommit: "y",
                            }), RELATION.BEHIND),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, new commits"),
                ],
                workdir: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, on old commit"),
                ],
            },
            "behind in index": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("z", "a"),
                            index: new Index("y", "a", RELATION.BEHIND),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, on old commit"),
                ],
            },
            "unrelated in index": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("z", "a"),
                            index: new Index("y", "a", RELATION.UNRELATED),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, on unrelated commit"),
                ],
            },
            "unknown in index": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            commit: new Commit("z", "a"),
                            index: new Index("y", "a", RELATION.UNKNOWN),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(FILESTATUS.MODIFIED,
                                         "x",
                                         "submodule, on unknown commit"),
                ],
            },
            "new sub, no commit": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            index: new Index(null, "a", null),
                        }),
                    },
                }),
                workdir: [
                    new StatusDescriptor(
                                  FILESTATUS.ADDED,
                                  "x",
                                  "submodule, create commit or stage changes"),
                ],
            },
            "new sub, no commit, open": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            index: new Index(null, "a", null),
                            workdir: new Workdir(new RepoStatus(), null),
                        }),
                    },
                }),
                workdir: [
                    new StatusDescriptor(
                                  FILESTATUS.ADDED,
                                  "x",
                                  "submodule, create commit or stage changes"),
                ],
            },
            "new sub, no commit but staged": {
                status: new RepoStatus({
                    submodules: {
                        x: new RepoStatus.Submodule({
                            index: new Index(null, "a", null),
                            workdir: new Workdir(new RepoStatus({
                                staged: { foo: FILESTATUS.ADDED },
                            }), null),
                        }),
                    },
                }),
                staged: [
                    new StatusDescriptor(
                                  FILESTATUS.ADDED,
                                  "x",
                                  "submodule, newly created"),
                ],
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const staged = c.staged || [];
                const workdir = c.workdir || [];
                const untracked = c.untracked || [];
                const result =
                            PrintStatusUtil.listSubmoduleDescriptors(c.status);
                assert.deepEqual(result, {
                    staged: staged,
                    workdir: workdir,
                    untracked: untracked,
                });
            });
        });
    });

    describe("accumulateStatus", function () {
        const Desc = StatusDescriptor;
        const cases = {
            "trivial": {
                input: new RepoStatus(),
                expected: {
                    staged: [],
                    workdir: [],
                    untracked: [],
                },
            },
            "staged": {
                input: new RepoStatus({
                    staged: { x: FILESTATUS.REMOVED },
                }),
                expected: {
                    staged: [ new Desc(FILESTATUS.REMOVED, "x", "") ],
                    workdir: [],
                    untracked: [],
                },
            },
            "workdir": {
                input: new RepoStatus({
                    workdir: { x: FILESTATUS.MODIFIED},
                }),
                expected: {
                    staged: [],
                    workdir: [new Desc(FILESTATUS.MODIFIED, "x", "")],
                    untracked: [],
                },
            },
            "untracked": {
                input: new RepoStatus({
                    workdir: { x: FILESTATUS.ADDED},
                }),
                expected: {
                    staged: [],
                    workdir: [],
                    untracked: ["x"],
                },
            },
            "all": {
                input: new RepoStatus({
                    staged: { x: FILESTATUS.REMOVED },
                    workdir: { 
                        y: FILESTATUS.MODIFIED,
                        z: FILESTATUS.ADDED,
                    },
                }),
                expected: {
                    staged: [ new Desc(FILESTATUS.REMOVED, "x", "") ],
                    workdir: [new Desc(FILESTATUS.MODIFIED, "y", "")],
                    untracked: ["z"],
                },
            },
            "submodule-specific": {
                input: new RepoStatus({
                    submodules: {
                        s: new Submodule({
                            commit: new Commit("a", "foo"),
                            index: new Index("a", "bar", RELATION.SAME),
                        }),
                    },
                }),
                expected: {
                    staged: [
                        new Desc(FILESTATUS.MODIFIED,
                                 "s",
                                 "submodule, new url"),
                    ],
                    workdir: [],
                    untracked: [],
                },
            },
            "submodule rollup": {
                input: new RepoStatus({
                    submodules: {
                        s: new Submodule({
                            commit: new Commit("2", "1"),
                            index: new Index("2", "1", RELATION.SAME),
                            workdir: new Workdir(new RepoStatus({
                                headCommit: "2",
                                staged: { x: FILESTATUS.REMOVED },
                                workdir: { 
                                    y: FILESTATUS.MODIFIED,
                                    z: FILESTATUS.ADDED,
                                },
                            }), RELATION.SAME),
                        }),
                    },
                }),
                expected: {
                    staged: [ new Desc(FILESTATUS.REMOVED, "s/x", "") ],
                    workdir: [new Desc(FILESTATUS.MODIFIED, "s/y", "")],
                    untracked: ["s/z"],
                },
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const result = PrintStatusUtil.accumulateStatus(c.input);
                const sort = PrintStatusUtil.sortDescriptorsByPath;
                const sortedResult = {
                    staged: sort(result.staged),
                    workdir: sort(result.workdir),
                    untracked: result.untracked.sort(),
                };
                assert.deepEqual(sortedResult, c.expected);
            });
        });
    });

    describe("printRebase", function () {
        const cases = {
            "basic": {
                input: new Rebase("master", "xxx", "ffffffffffffffff"),
                check: /rebase in progress/
            },
            "branch": {
                input: new Rebase("master", "xxx", "ffffffffffffffff"),
                check: /master/
            },
            "sha": {
                input: new Rebase("master", "xxx", "ffffffffffffffff"),
                check: /ffff/,
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const result = PrintStatusUtil.printRebase(c.input);
                assert.match(result, c.check);
            });
        });
    });

    describe("printCurrentBranch", function () {
        const cases = {
            "normal": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    headCommit: "aaaaaaaaaaaaaaaa",
                }),
                check: /master/,
            },
            "detached": {
                input: new RepoStatus({
                    headCommit: "aaaaaaaaaaaaaaaa",
                }),
                check: /aaaa/,
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const result = PrintStatusUtil.printCurrentBranch(c.input);
                assert.match(result, c.check);
            });
        });
    });

    describe("printRepoStatus", function () {
        // Most of the logic for this method is implemented in terms of
        // other methods that are already tested; we just need to validate that
        // the results are chained together.

        // TODO: more testing here

        // We'll use repo `x` for printing.

        const cases = {
            "trivial": {
                input: new RepoStatus({
                    currentBranchName: "master",
                }),
                regex: /On branch.*master.*\n.*nothing to commit.*/,
            },
            "rebase": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    rebase: new Rebase("x", "y", "z"),
                }),
                regex: /rebas/,
            },
            "detached": {
                input: new RepoStatus({
                    headCommit: "ffffaaaaffffaaaa",
                }),
                regex: /detached/,
            },
            "dirty meta": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    staged: {
                        qrst: FILESTATUS.ADDED,
                    },
                }),
                regex: /.*qrst/,
            },
            "dirty sub": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    submodules: {
                        qrst: new Submodule({
                            index: new Index(null, "a", null),
                            workdir: new Workdir(new RepoStatus({
                                staged: {
                                    "x/y/z": FILESTATUS.MODIFIED,
                                },
                            }), null),
                        }),
                    },
                }),
                regex: /qrst\/x\/y\/z/,
            },
            "cwd": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    staged: {
                        qrst: FILESTATUS.ADDED,
                    },
                }),
                cwd: "u/v",
                regex: /\.\.\/\.\.\/qrst/,
            },
            "untracked": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    workdir: { foo: FILESTATUS.ADDED },
                }),
                exact: `\
On branch ${colors.green("master")}.
Untracked files:
  (use "git meta add <file>..." to include in what will be committed)

\t${colors.red("foo")}

`,
            },
            "change in sub workdir": {
                input: new RepoStatus({
                    currentBranchName: "master",
                    submodules: {
                        zap: new Submodule({
                            commit: new Commit("1", "/a"),
                            index: new Index("2", "/a", RELATION.AHEAD),
                        }),
                    },
                }),
                exact: `\
On branch ${colors.green("master")}.
Changes to be committed:

\t${colors.green("modified:     zap")} (submodule, new commits)

`,
            },
        };
        Object.keys(cases).forEach(caseName => {
            const c = cases[caseName];
            it(caseName, function () {
                const cwd = c.cwd || "";
                const result = PrintStatusUtil.printRepoStatus(c.input, cwd);
                if (c.exact) {
                    const resultLines = result.split("\n");
                    const expectedLines = c.exact.split("\n");
                    assert.deepEqual(resultLines, expectedLines);
                }
                else if (c.inverse) {
                    assert.notMatch(result, c.regex);
                }
                else {
                    assert.match(result, c.regex);
                }
            });
        });
    });
});
