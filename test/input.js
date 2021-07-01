import path from 'path'
import {PassThrough} from 'stream'
import test from 'tape'
import unified from 'unified'
import vfile from 'to-vfile'
import figures from 'figures'
import noop from './util/noop-processor.js'
import spy from './util/spy.js'
import {engine} from '../index.js'

var join = path.join

var fixtures = join('test', 'fixtures')

test('input', function (t) {
  t.plan(19)

  t.test('should fail without input', function (t) {
    var stream = new PassThrough()

    t.plan(1)

    // Spoof stdin(4).
    stream.isTTY = true

    engine({processor: unified, streamIn: stream}, onrun)

    stream.end()

    function onrun(error) {
      t.equal(error.message, 'No input', 'should fail')
    }
  })

  t.test('should not fail on empty input stream', function (t) {
    var stderr = spy()
    var stream = new PassThrough()

    t.plan(1)

    engine(
      {
        processor: noop,
        streamIn: stream,
        streamError: stderr.stream
      },
      onrun
    )

    stream.end('')

    function onrun(error, code) {
      t.deepEqual(
        [error, code, stderr()],
        [null, 0, '<stdin>: no issues found\n'],
        'should report'
      )
    }
  })

  t.test('should not fail on unmatched given globs', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: unified,
        cwd: join(fixtures, 'empty'),
        streamError: stderr.stream,
        files: ['.']
      },
      onrun
    )

    function onrun(error, code) {
      t.deepEqual([error, code, stderr()], [null, 0, ''], 'should work')
    }
  })

  t.test('should report unfound given files', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: unified,
        cwd: join(fixtures, 'empty'),
        streamError: stderr.stream,
        files: ['readme.md']
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'readme.md',
        '  1:1  error  No such file or directory',
        '',
        figures.cross + ' 1 error',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 1, expected], 'should report')
    }
  })

  t.test('should not report unfound given directories', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: unified,
        cwd: join(fixtures, 'directory'),
        streamError: stderr.stream,
        files: ['empty/']
      },
      onrun
    )

    function onrun(error, code) {
      t.deepEqual([error, code, stderr()], [null, 0, ''])
    }
  })

  t.test('should search for extensions', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'extensions'),
        streamError: stderr.stream,
        files: ['.'],
        extensions: ['txt', '.text']
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'bar.text: no issues found',
        'foo.txt: no issues found',
        'nested' + path.sep + 'quux.text: no issues found',
        'nested' + path.sep + 'qux.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search a directory for extensions', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'extensions'),
        streamError: stderr.stream,
        files: ['nested'],
        extensions: ['txt', 'text']
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'quux.text: no issues found',
        'nested' + path.sep + 'qux.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search for globs matching files (#1)', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'globs'),
        streamError: stderr.stream,
        files: ['*/*.+(txt|text)'],
        extensions: []
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'no-3.txt: no issues found',
        'nested' + path.sep + 'no-4.text: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search for globs matching files (#2)', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'globs'),
        streamError: stderr.stream,
        files: ['*/*.txt', '*/*.text'],
        extensions: []
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'no-3.txt: no issues found',
        'nested' + path.sep + 'no-4.text: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search for globs matching dirs', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'globs'),
        streamError: stderr.stream,
        files: ['**/nested'],
        extensions: []
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'no-3.txt: no issues found',
        'nested' + path.sep + 'no-4.text: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search vfile’s pointing to directories', function (t) {
    var cwd = join(fixtures, 'ignore-file')
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: [vfile(join(cwd, 'nested'))]
      },
      onrun
    )

    function onrun(error, code) {
      t.deepEqual(
        [error, code, stderr()],
        [null, 0, 'nested' + path.sep + 'three.txt: no issues found\n'],
        'should report'
      )
    }
  })

  t.test('should not ignore implicitly ignored files in globs', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'globs-ignore'),
        streamError: stderr.stream,
        files: ['**/*.txt'],
        extensions: []
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' +
          path.sep +
          'node_modules' +
          path.sep +
          'ignore-two.txt: no issues found',
        'nested' + path.sep + 'two.txt: no issues found',
        'node_modules' + path.sep + 'ignore-one.txt: no issues found',
        'one.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should include given ignored files (#1)', function (t) {
    var cwd = join(fixtures, 'ignore-file')
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: [
          vfile(join(cwd, 'one.txt')),
          vfile(join(cwd, 'nested', 'two.txt')),
          vfile(join(cwd, 'nested', 'three.txt'))
        ]
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'three.txt: no issues found',
        'nested' + path.sep + 'two.txt',
        '  1:1  error  Cannot process specified file: it’s ignored',
        '',
        'one.txt: no issues found',
        '',
        figures.cross + ' 1 error',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 1, expected], 'should report')
    }
  })

  t.test('should not atempt to read files with `contents` (1)', function (t) {
    var stderr = spy()
    var cwd = join(fixtures, 'ignore-file')
    var file = vfile({path: join(cwd, 'not-existing.txt'), contents: 'foo'})

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: [file]
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'not-existing.txt',
        '  1:1  error  Cannot process specified file: it’s ignored',
        '',
        figures.cross + ' 1 error',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 1, expected], 'should report')
    }
  })

  t.test('should not atempt to read files with `contents` (2)', function (t) {
    var stderr = spy()
    var cwd = join(fixtures, 'ignore-file')
    var file = vfile({path: join(cwd, 'not-existing-2.txt'), contents: 'foo'})

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: [file]
      },
      onrun
    )

    function onrun(error, code) {
      t.deepEqual(
        [error, code, stderr()],
        [null, 0, 'not-existing-2.txt: no issues found\n'],
        'should report'
      )
    }
  })

  t.test('should include given ignored files (#2)', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'ignore-file'),
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: ['**/*.txt']
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'three.txt: no issues found',
        'nested' + path.sep + 'two.txt',
        '  1:1  error  Cannot process specified file: it’s ignored',
        '',
        'one.txt: no issues found',
        '',
        figures.cross + ' 1 error',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 1, expected], 'should report')
    }
  })

  t.test('silentlyIgnore: skip detected ignored files (#1)', function (t) {
    var cwd = join(fixtures, 'ignore-file')
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        silentlyIgnore: true,
        files: [
          vfile(join(cwd, 'one.txt')),
          vfile(join(cwd, 'nested', 'two.txt')),
          vfile(join(cwd, 'nested', 'three.txt'))
        ]
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'three.txt: no issues found',
        'one.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('silentlyIgnore: skip detected ignored files (#2)', function (t) {
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: join(fixtures, 'ignore-file'),
        silentlyIgnore: true,
        streamError: stderr.stream,
        ignoreName: '.fooignore',
        files: ['**/*.txt']
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'three.txt: no issues found',
        'one.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })

  t.test('should search if given files', function (t) {
    var cwd = join(fixtures, 'simple-structure')
    var stderr = spy()

    t.plan(1)

    engine(
      {
        processor: noop,
        cwd: cwd,
        streamError: stderr.stream,
        extensions: ['txt'],
        files: ['nested', vfile(join(cwd, 'one.txt'))]
      },
      onrun
    )

    function onrun(error, code) {
      var expected = [
        'nested' + path.sep + 'three.txt: no issues found',
        'nested' + path.sep + 'two.txt: no issues found',
        'one.txt: no issues found',
        ''
      ].join('\n')

      t.deepEqual([error, code, stderr()], [null, 0, expected], 'should report')
    }
  })
})
