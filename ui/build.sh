clear

if [ -e dist.zip ]; then
    rm dist.zip
fi

if [ -e dist ]; then
    rm -rf dist/
fi

ng build $1 --aot --build-optimizer
cd dist
rm *.map
zip -r ../dist.zip *.js assets/* index.html *.css
cd ../
cp dist.zip ../out/dist.zip
