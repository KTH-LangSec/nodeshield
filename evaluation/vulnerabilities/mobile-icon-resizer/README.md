# `mobile-icon-resizer` demo

## Comment

This attack uses `--strategy log` instead of `--strategy exit` because the
package attempts to `require` the config file in this directory. This would be
a violation that exits the process, but this would be a false positive. Hence,
we run this example in log mode and check the logs for a violation as a result
of the code injection.
