Documentation is Python 3.12 (and later) based.

ReadTheDocs web site reads the '.readthedocs.yml' file
in the root of the package.

All manual doc commands run from this directory here. 
See comments in 'conf.py' to get an idea. 
(pip install, sphinx-apidoc, make html)
Python doc realted packages (pip) must be installed before
building the document structure.

> /docs>pip install -r requrirements.txt
# https://github.com/mozilla/sphinx-js
> npm install -g jsdoc # the nodeJs package to read comments in .js
or
< npm install --save-dev jsdoc # in project root to fill package.json
> sphinx-apidoc -f -o source/ ../static/
> make html 
Fix all errors/warnings shown in the console then.

The runner is /docs/source/conf.py.
Prep environment and copying images and readme files.
Images are in /.github.
# example (complete) project https://searchfox.org/mozilla-central/source/docs/conf.py

'make html' will generate a local web site /docs/build. 
This web site is for debugging design and fixing of errors 
in the .rst files. 
It 'can' be part of a commit. So a dev can 
read the documentation offline from a package pull.
ReadTheDocs site does not need the generated files. It will
do it itself by reading the '.readthedocs.yml' file.
