#!/usr/bin/env bash

kindle_path="/media/$USER/Kindle"

if [ ! -d "$kindle_path" ]; then
  echo "Kindle not mounted, exiting"
  exit 1
fi

echo "Copying My Clippings.txt from Kindle to resources folder"
cp "$kindle_path/documents/My Clippings.txt" resources/

echo "Running Notion synchronization"
npm start
