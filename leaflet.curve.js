// Leaflet.Curve - A Leaflet plugin for drawing Bézier curves and other complex shapes.
// https://github.com/elfalem/Leaflet.curve

(function (L) {
    'use strict';

    function pointOnLine(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t
        ];
    }


    function pointOnCubicBezier(points, t) {
        var a = pointOnLine(points[0], points[1], t);
        var b = pointOnLine(points[1], points[2], t);
        var c = pointOnLine(points[2], points[3], t);
        var d = pointOnLine(a, b, t);
        var e = pointOnLine(b, c, t);
        return pointOnLine(d, e, t);
    }


    function getPointOnPath(path, t) {
        var i, cmd, len, segLen, segT, segStart, segEnd, segStartControl, segEndControl, points, segStartT, segEndT;
        var segStartTmp, segEndTmp, segStartControlTmp, segEndControlTmp;
        var segStartPoint, segEndPoint, segStartControlPoint, segEndControlPoint;
        var segStartPointTmp, segEndPointTmp, segStartControlPointTmp, segEndControlPointTmp;
        var segStartTValue, segEndTValue, segTValue;
        var segStartX, segStartY, segEndX, segEndY, segStartControlX, segStartControlY, segEndControlX, segEndControlY;
        var segStartXTmp, segStartYTmp, segEndXTmp, segEndYTmp, segStartControlXTmp, segStartControlYTmp, segEndControlXTmp, segEndControlYTmp;
        var x, y, x1, y1, x2, y2, x3, y3, x4, y4;
        var t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24, t25, t26, t27, t28, t29, t30, t31, t32, t33, t34, t35, t36, t37, t38, t39, t40, t41, t42, t43, t44, t45, t46, t47, t48, t49, t50, t51, t52, t53, t54, t55, t56, t57, t58, t59, t60, t61, t62, t63, t64, t65, t66, t67, t68, t69, t70, t71, t72, t73, t74, t75, t76, t77, t78, t79, t80, t81, t82, t83, t84, t85, t86, t87, t88, t89, t90, t91, t92, t93, t94, t95, t96, t97, t98, t99, t100;
        var i, j, cmd, len, pathLen, segLen, segT, segStart, segEnd, segStartControl, segEndControl, points, segStartT, segEndT;
        var segStartTmp, segEndTmp, segStartControlTmp, segEndControlTmp;
        var segStartPoint, segEndPoint, segStartControlPoint, segEndControlPoint;
        var segStartPointTmp, segEndPointTmp, segStartControlPointTmp, segEndControlPointTmp;
        var segStartTValue, segEndTValue, segTValue;
        var segStartX, segStartY, segEndX, segEndY, segStartControlX, segStartControlY, segEndControlX, segEndControlY;
        var segStartXTmp, segStartYTmp, segEndXTmp, segEndYTmp, segStartControlXTmp, segStartControlYTmp, segEndControlXTmp, segEndControlYTmp;
        var x, y, x1, y1, x2, y2, x3, y3, x4, y4;
        var t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18, t19, t20, t21, t22, t23, t24, t25, t26, t27, t28, t29, t30, t31, t32, t33, t34, t35, t36, t37, t38, t39, t40, t41, t42, t43, t44, t45, t46, t47, t48, t49, t50, t51, t52, t53, t54, t55, t56, t57, t58, t59, t60, t61, t62, t63, t64, t65, t66, t67, t68, t69, t70, t71, t72, t73, t74, t75, t76, t77, t78, t79, t80, t81, t82, t83, t84, t85, t86, t87, t88, t89, t90, t91, t92, t93, t94, t95, t96, t97, t98, t99, t100;
        
        pathLen = path.length;
        if (pathLen === 0) {
            return null;
        }
        
        // Find the segment that contains t
        for (i = 0; i < pathLen; i++) {
            cmd = path[i];
            if (cmd[0] === 'M') {
                segStart = [cmd[1], cmd[2]];
                segEnd = segStart;
            } else if (cmd[0] === 'L') {
                segEnd = [cmd[1], cmd[2]];
                segStart = segEnd;
            } else if (cmd[0] === 'C') {
                segStartControl = [cmd[1], cmd[2]];
                segEndControl = [cmd[3], cmd[4]];
                segEnd = [cmd[5], cmd[6]];
                
                // Calculate the approximate length of the curve
                points = [];
                for (j = 0; j <= 10; j++) {
                    points.push(pointOnCubicBezier([segStart, segStartControl, segEndControl, segEnd], j / 10));
                }
                
                segLen = 0;
                for (j = 1; j < points.length; j++) {
                    segLen += Math.sqrt(
                        Math.pow(points[j][0] - points[j-1][0], 2) + 
                        Math.pow(points[j][1] - points[j-1][1], 2)
                    );
                }
                
                if (t <= segLen) {
                    // Find the point on this segment
                    segT = t / segLen;
                    return pointOnCubicBezier([segStart, segStartControl, segEndControl, segEnd], segT);
                }
                
                t -= segLen;
                segStart = segEnd;
            }
        }
        
        // If we get here, return the last point
        return segEnd;
    }


    L.Curve = L.Path.extend({
        initialize: function (path, options) {
            L.setOptions(this, options);
            this._path = path;
            this._points = this._convertPath();
        },

        projectLatlngs: function () {
            this._originalPoints = [];
            this._projectedPoints = [];
            
            var i, len, point, containerPoint;
            
            for (i = 0, len = this._points.length; i < len; i++) {
                point = this._points[i];
                containerPoint = this._map.latLngToLayerPoint([point[1], point[0]]);
                this._originalPoints.push([point[0], point[1]]);
                this._projectedPoints.push([containerPoint.x, containerPoint.y]);
            }
            
            this._updatePath();
        },

        getPath: function () {
            return this._path;
        },

        setPath: function (path) {
            this._path = path;
            this._points = this._convertPath();
            return this.redraw();
        },

        _convertPath: function () {
            var path = this._path;
            var points = [];
            var i, cmd, x, y, x1, y1, x2, y2, x3, y3;
            var startX, startY, prevX, prevY, prev2X, prev2Y;
            var bezierPoints = [];
            
            for (i = 0; i < path.length; i++) {
                cmd = path[i];
                
                if (cmd[0] === 'M') { // MoveTo
                    x = cmd[1];
                    y = cmd[2];
                    points.push([x, y]);
                    startX = x;
                    startY = y;
                    prevX = x;
                    prevY = y;
                } else if (cmd[0] === 'L') { // LineTo
                    x = cmd[1];
                    y = cmd[2];
                    points.push([x, y]);
                    prevX = x;
                    prevY = y;
                } else if (cmd[0] === 'C') { // CurveTo
                    x1 = cmd[1];
                    y1 = cmd[2];
                    x2 = cmd[3];
                    y2 = cmd[4];
                    x3 = cmd[5];
                    y3 = cmd[6];
                    
                    // Convert cubic bezier to line segments
                    bezierPoints = [];
                    for (var t = 0; t <= 1; t += 0.05) {
                        x = Math.pow(1-t, 3) * prevX + 3 * Math.pow(1-t, 2) * t * x1 + 3 * (1-t) * t * t * x2 + t * t * t * x3;
                        y = Math.pow(1-t, 3) * prevY + 3 * Math.pow(1-t, 2) * t * y1 + 3 * (1-t) * t * t * y2 + t * t * t * y3;
                        bezierPoints.push([x, y]);
                    }
                    
                    // Add the last point
                    bezierPoints.push([x3, y3]);
                    
                    // Add the bezier points to the main points array
                    points = points.concat(bezierPoints);
                    
                    prevX = x3;
                    prevY = y3;
                } else if (cmd[0] === 'Q') { // Quadratic curve
                    x1 = cmd[1];
                    y1 = cmd[2];
                    x2 = cmd[3];
                    y2 = cmd[4];
                    
                    // Convert quadratic bezier to line segments
                    bezierPoints = [];
                    for (var t = 0; t <= 1; t += 0.05) {
                        x = Math.pow(1-t, 2) * prevX + 2 * (1-t) * t * x1 + t * t * x2;
                        y = Math.pow(1-t, 2) * prevY + 2 * (1-t) * t * y1 + t * t * y2;
                        bezierPoints.push([x, y]);
                    }
                    
                    // Add the last point
                    bezierPoints.push([x2, y2]);
                    
                    // Add the bezier points to the main points array
                    points = points.concat(bezierPoints);
                    
                    prevX = x2;
                    prevY = y2;
                } else if (cmd[0] === 'Z') { // ClosePath
                    points.push([startX, startY]);
                    prevX = startX;
                    prevY = startY;
                }
            }
            
            return points;
        },

        _updatePath: function () {
            if (!this._map) { return; }
            
            this._dashArray = this.options.dashArray;
            this._dashOffset = this.options.dashOffset;
            
            this._renderer._updateCurve(this);
        },

        _project: function () {
            this.projectLatlngs();
        },

        _update: function () {
            if (this._map) {
                this._updatePath();
            }
        },

        _initEvents: function () {
            L.Path.prototype._initEvents.call(this);
        },

        _onClick: function (e) {
            if (this._map.dragging && this._map.dragging.moved()) { return; }
            this._fireMouseEvent(e);
        },

        _onMouseDown: function (e) {
            if (this._map.dragging) {
                this._map.dragging._draggable._moving = true;
            }
            this._fireMouseEvent(e);
        },

        _onMouseOut: function (e) {
            this._fireMouseEvent(e);
        },

        _onMouseOver: function (e) {
            this._fireMouseEvent(e);
        },

        _fireMouseEvent: function (e) {
            if (!this._map) { return; }
            
            var type = e.type;
            
            this.fire(type, {
                latlng: this._map.layerPointToLatLng(e.layerPoint),
                layerPoint: e.layerPoint,
                originalEvent: e.originalEvent
            });
            
            if (this._eventParents) {
                this._eventParents(type, e);
            }
        },

        _containsPoint: function (p) {
            var i, j, k, len, len2, point, points, x, y, inside;
            
            if (!this._pxBounds || !this._pxBounds.contains(p)) { return false; }
            
            // Transform points to the pixel coordinate space
            var pxPoints = [];
            var latLngs = this._latlngs || [];
            
            for (i = 0, len = latLngs.length; i < len; i++) {
                point = this._map.latLngToLayerPoint(latLngs[i]);
                pxPoints.push([point.x, point.y]);
            }
            
            // Ray casting algorithm to determine if point is inside the polygon
            inside = false;
            for (i = 0, j = pxPoints.length - 1; i < pxPoints.length; j = i++) {
                x = pxPoints[i][0];
                y = pxPoints[i][1];
                x2 = pxPoints[j][0];
                y2 = pxPoints[j][1];
                
                var intersect = ((y > p.y) !== (y2 > p.y)) &&
                    (p.x < (x2 - x) * (p.y - y) / (y2 - y) + x);
                if (intersect) {
                    inside = !inside;
                }
            }
            
            return inside;
        }
    });

    L.curve = function (path, options) {
        return new L.Curve(path, options);
    };

    L.curve.Util = {
        pointOnLine: pointOnLine,
        pointOnCubicBezier: pointOnCubicBezier,
        getPointOnPath: getPointOnPath
    };

    // Add curve support to the SVG renderer
    L.SVG.include({
        _updateCurve: function (layer) {
            var path = [];
            var i, j, cmd, point, prevPoint, control1, control2;
            
            for (i = 0; i < layer._path.length; i++) {
                cmd = layer._path[i];
                
                if (cmd[0] === 'M') { // MoveTo
                    point = this._pointToPathCommand(cmd[1], cmd[2]);
                    path.push('M' + point.x + ',' + point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'L') { // LineTo
                    point = this._pointToPathCommand(cmd[1], cmd[2]);
                    path.push('L' + point.x + ',' + point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'C') { // CurveTo
                    control1 = this._pointToPathCommand(cmd[1], cmd[2]);
                    control2 = this._pointToPathCommand(cmd[3], cmd[4]);
                    point = this._pointToPathCommand(cmd[5], cmd[6]);
                    path.push('C' + control1.x + ',' + control1.y + ' ' + control2.x + ',' + control2.y + ' ' + point.x + ',' + point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'Q') { // Quadratic curve
                    control1 = this._pointToPathCommand(cmd[1], cmd[2]);
                    point = this._pointToPathCommand(cmd[3], cmd[4]);
                    path.push('Q' + control1.x + ',' + control1.y + ' ' + point.x + ',' + point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'Z') { // ClosePath
                    path.push('Z');
                }
            }
            
            this._setPath(layer, path.join(' '));
        },
        
        _pointToPathCommand: function (x, y) {
            return this._map.latLngToLayerPoint([y, x]);
        }
    });

    // Add curve support to the Canvas renderer
    L.Canvas.include({
        _updateCurve: function (layer) {
            if (!this._drawing || layer._empty()) { return; }
            
            var ctx = this._ctx;
            var i, j, cmd, point, prevPoint, control1, control2;
            
            this._dashArray = layer.options.dashArray;
            this._dashOffset = layer.options.dashOffset;
            
            this._updateStyle(layer);
            
            if (this._dashArray) {
                ctx.setLineDash(this._dashArray);
                ctx.lineDashOffset = this._dashOffset || 0;
            }
            
            ctx.beginPath();
            
            for (i = 0; i < layer._path.length; i++) {
                cmd = layer._path[i];
                
                if (cmd[0] === 'M') { // MoveTo
                    point = this._pointToPathCommand(cmd[1], cmd[2]);
                    ctx.moveTo(point.x, point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'L') { // LineTo
                    point = this._pointToPathCommand(cmd[1], cmd[2]);
                    ctx.lineTo(point.x, point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'C') { // CurveTo
                    control1 = this._pointToPathCommand(cmd[1], cmd[2]);
                    control2 = this._pointToPathCommand(cmd[3], cmd[4]);
                    point = this._pointToPathCommand(cmd[5], cmd[6]);
                    ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, point.x, point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'Q') { // Quadratic curve
                    control1 = this._pointToPathCommand(cmd[1], cmd[2]);
                    point = this._pointToPathCommand(cmd[3], cmd[4]);
                    ctx.quadraticCurveTo(control1.x, control1.y, point.x, point.y);
                    prevPoint = point;
                } else if (cmd[0] === 'Z') { // ClosePath
                    ctx.closePath();
                }
            }
            
            this._fillStroke(ctx, layer);
            
            if (this._dashArray) {
                ctx.setLineDash([]);
            }
        },
        
        _pointToPathCommand: function (x, y) {
            return this._map.latLngToContainerPoint([y, x]);
        }
    });

})(window.L);
