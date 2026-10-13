import { frameworkRegistry } from '../core/registry';
import { pairedTrajectoryForestFramework } from './pairedTrajectoryForest';
import { raincloudHorizonFramework } from './raincloudHorizon';
import { kaplanMeierFramework } from './kaplanMeier';
import { volcanoFramework } from './volcanoPlot';
import { alluvialFramework } from './alluvialFlow';
import { paretoFrontierFramework } from './paretoFrontier';
import { clusteredHeatmapFramework } from './clusteredHeatmap';
import { phaseSpaceFramework } from './phaseSpace';
import { parallelCoordinatesFramework } from './parallelCoordinates';
import { funnelBiasFramework } from './funnelPlot';
import { ridgeplotFramework } from './ridgeplotDensity';
import { rocComparisonFramework } from './rocComparison';

// Register all 10+ Bespoke Research Visual Frameworks
frameworkRegistry.register(pairedTrajectoryForestFramework);
frameworkRegistry.register(raincloudHorizonFramework);
frameworkRegistry.register(kaplanMeierFramework);
frameworkRegistry.register(volcanoFramework);
frameworkRegistry.register(alluvialFramework);
frameworkRegistry.register(paretoFrontierFramework);
frameworkRegistry.register(clusteredHeatmapFramework);
frameworkRegistry.register(phaseSpaceFramework);
frameworkRegistry.register(parallelCoordinatesFramework);
frameworkRegistry.register(funnelBiasFramework);
frameworkRegistry.register(ridgeplotFramework);
frameworkRegistry.register(rocComparisonFramework);

export {
  pairedTrajectoryForestFramework,
  raincloudHorizonFramework,
  kaplanMeierFramework,
  volcanoFramework,
  alluvialFramework,
  paretoFrontierFramework,
  clusteredHeatmapFramework,
  phaseSpaceFramework,
  parallelCoordinatesFramework,
  funnelBiasFramework,
  ridgeplotFramework,
  rocComparisonFramework,
};
