/*jshint node:true*/
"use strict";

var _ = require('lodash');
var colors = require('colors');
var diff = require('diff');
var stringify = require('../display/stringify-node');
var cssPath = require('../util/css-path');
var node = require('../util/cheerio-utils').node;
var safeParent = require('../util/cheerio-utils').safeParent;

module.exports = {
  added: added,
  removed: removed,
  changed: changed,
  changedText: changed,

  DiffLevel: {
    SAME_BUT_DIFFERENT: 'same-but-different',
    NOT_THE_SAME_NODE: 'not-the-same-node',
    IDENTICAL: 'identical'
  }
};

// ==========================================================

function added($addedNode, $parentBefore, indexBefore, $parentAfter, indexAfter) {
  return {
    type: "added",
    before: locationInfo($parentBefore, undefined, indexBefore),
    after:  locationInfo($parentAfter, $addedNode, indexAfter),
    message: "Added:    " + colors.green(stringify($addedNode)),
  };
}

function removed($removedNode, $parentBefore, indexBefore, $parentAfter, indexAfter) {
  return {
    type: "removed",
    before: locationInfo($parentBefore, $removedNode, indexBefore),
    after:  locationInfo($parentAfter, undefined, indexAfter),
    message: "Removed:  " + colors.red(stringify($removedNode))
  };
}

function changed($nodeBefore, $nodeAfter) {
  // the 'changed' type doesn't have parents/indices available up front, so
  // we have to find them out here
  var before = grabParentAndIndex($nodeBefore),
      after = grabParentAndIndex($nodeAfter);

  // base info about the change
  return {
    type: "changed",
    before: locationInfo(before.$parent, $nodeBefore, before.index),
    after: locationInfo(after.$parent, $nodeAfter, after.index),
    message: "Modified: " + coloredChanges(stringify($nodeBefore), stringify($nodeAfter))
  };
}

// === common functionality for nailing down change locations

function locationInfo($parentNode, $node, index) {
  var siblingsInfo = findSiblings($parentNode, $node, index);

  return _.extend(siblingsInfo, {
    // paths to the node itself and the parent
    parentPath: cssPath($parentNode),
    path: $node ? cssPath($node) : undefined,

    // index of the node (or the point where you'd have to insert it, if it's not in this DOM)
    index: index,

    // nodes
    $node: $node, $parent: $parentNode
  });
}

function findSiblings($parentNode, $node, index) {
  var $ = $parentNode.cheerio;

  var prevIndex = index - 1;
  var nextIndex = $node ? (index + 1) : index;   // if the node doesn't actually exist in this DOM
  // $next should point to what *would* be the next node
  var parentContents = $parentNode.contents();
  var prevExists = (prevIndex >= 0 && prevIndex < parentContents.length);
  var nextExists = (nextIndex >= 0 && nextIndex < parentContents.length);

  return {
    $previous: prevExists ? $($parentNode.contents()[prevIndex]) : undefined,
    $next: nextExists ? $($parentNode.contents()[nextIndex]) : undefined
  };
}

function grabParentAndIndex($node) {
  var $ = $node.cheerio, $parent = node($, safeParent($node));
  var index = _.findIndex($parent.contents(), function(n) {
    return $(n).is($node);
  });
  return {$parent: $parent, index: index};
}

// === colored messages

function coloredChanges(beforeStr, afterStr) {
  var parts = diff.diffWords(beforeStr, afterStr);
  return _.map(parts, function(part) {
    var color = part.added ? 'green' : (part.removed ? 'red' : 'grey');
    return colors[color](part.value);
  }).join("");
}
